"""Analysis API endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisMetadata,
    AnalysisRequest,
    AnalysisResult as AnalysisResultSchema,
    AnalysisExtension as AnalysisExtensionSchema,
    ExtendedAnalysisResponse,
)
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.models.feedback import Feedback
from app.services.analysis import get_analysis_service
from app.services.agents import AnalysisOrchestrator
from app.services.subscription import get_subscription_service
from app.services.exam import get_exam_service

router = APIRouter(tags=["analysis"])


@router.post(
    "/exams/{exam_id}/analyze",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="시험지 분석 요청"
)
async def request_analysis(
    exam_id: str,
    request: AnalysisRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AnalysisCreateResponse:
    """시험지 분석을 요청합니다.

    - 사용량 한도를 체크하고 소비합니다.
    - 빈 시험지(blank): 1크레딧, 학생 답안지(student): 2크레딧
    - 한도 초과 시 402 Payment Required 반환
    """
    # 시험지 조회하여 exam_type 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(exam_id, current_user.id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다."
            }
        )

    # 사용량 체크 및 소비 (exam_type에 따라 차등)
    subscription_service = get_subscription_service(db)
    can_analyze = await subscription_service.consume_analysis(
        current_user.id,
        exam_type=exam.exam_type
    )

    if not can_analyze:
        credit_cost = 2 if exam.exam_type == "student" else 1
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "USAGE_LIMIT_EXCEEDED",
                "message": f"이번 달 분석 한도를 초과했습니다. (필요: {credit_cost}크레딧) 구독을 업그레이드하거나 크레딧을 구매해주세요."
            }
        )

    analysis_service = get_analysis_service(db)
    result = await analysis_service.request_analysis(
        exam_id=exam_id,
        user_id=current_user.id,
        force_reanalyze=request.force_reanalyze
    )

    return AnalysisCreateResponse(data=result)


@router.get(
    "/exams/{exam_id}/analysis",
    summary="시험지의 분석 결과 ID 조회"
)
async def get_analysis_by_exam(
    exam_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """시험지에 연결된 분석 결과 ID를 조회합니다."""
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis_by_exam(exam_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    return {"analysis_id": analysis.id}


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisDetailResponse,
    summary="분석 결과 조회"
)
async def get_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AnalysisDetailResponse:
    """분석 결과를 조회합니다."""

    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    # Check ownership
    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    try:
        result_data = AnalysisResultSchema.model_validate(analysis)
    except Exception as e:
        print(f"[ERROR] Validation failed for analysis {analysis_id}: {e}")
        print(f"  Summary: {analysis.summary}")
        print(f"  Questions: {analysis.questions}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "VALIDATION_ERROR", "message": f"데이터 검증 실패: {str(e)}"}
        )

    return AnalysisDetailResponse(
        data=result_data,
        meta=AnalysisMetadata(
            cache_hit=True,
            analysis_duration=1.5
        )
    )


# ============================================
# Extended Analysis Endpoints (4단계 보고서)
# ============================================


@router.post(
    "/analysis/{analysis_id}/extended",
    response_model=AnalysisExtensionSchema,
    status_code=status.HTTP_201_CREATED,
    summary="확장 분석 생성 (취약점/학습계획/성과예측)"
)
async def generate_extended_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    force_regenerate: bool = False,
) -> AnalysisExtensionSchema:
    """확장 분석을 생성합니다.

    - 취약점 분석: 난이도별, 유형별, 단원별 취약점
    - 학습 계획: 8주 맞춤형 학습 로드맵
    - 성과 예측: 3/6/12개월 점수 예측
    - 사용량 한도를 체크하고 소비합니다.
    - **학생 답안지(student)만 확장 분석 가능**
    """
    # 기본 분석 소유권 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 시험지 유형 확인 (빈 시험지는 확장 분석 불가)
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(str(analysis.exam_id), current_user.id)

    if exam and exam.exam_type == "blank":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BLANK_EXAM_NOT_SUPPORTED",
                "message": "빈 시험지는 확장 분석을 사용할 수 없습니다. 학생 답안지를 업로드해주세요."
            }
        )

    # 사용량 체크 및 소비
    subscription_service = get_subscription_service(db)
    can_use_extended = await subscription_service.consume_extended(current_user.id)

    if not can_use_extended:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "USAGE_LIMIT_EXCEEDED",
                "message": "확장 분석 한도를 초과했습니다. 구독을 업그레이드하거나 크레딧을 구매해주세요."
            }
        )

    try:
        orchestrator = AnalysisOrchestrator(db)
        extension = await orchestrator.generate_extended_analysis(
            analysis_id=analysis_id,
            user_id=current_user.id,
            force_regenerate=force_regenerate,
        )
        return extension
    except Exception as e:
        print(f"Extended analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "EXTENDED_ANALYSIS_FAILED", "message": f"확장 분석 실패: {str(e)}"}
        )


@router.get(
    "/analysis/{analysis_id}/extended",
    response_model=AnalysisExtensionSchema,
    summary="확장 분석 조회"
)
async def get_extended_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> AnalysisExtensionSchema:
    """저장된 확장 분석을 조회합니다."""
    # 기본 분석 소유권 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    orchestrator = AnalysisOrchestrator(db)
    extension = await orchestrator.get_extended_analysis(analysis_id)

    if not extension:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "EXTENSION_NOT_FOUND", "message": "확장 분석이 없습니다. POST로 생성하세요."}
        )

    return extension


@router.get(
    "/analysis/{analysis_id}/report",
    response_model=ExtendedAnalysisResponse,
    summary="4단계 통합 보고서 조회"
)
async def get_full_report(
    analysis_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> ExtendedAnalysisResponse:
    """기본 분석 + 확장 분석 통합 보고서를 조회합니다."""
    # 기본 분석
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    basic_data = AnalysisResultSchema.model_validate(analysis)

    # 확장 분석 (없으면 None)
    orchestrator = AnalysisOrchestrator(db)
    extension = await orchestrator.get_extended_analysis(analysis_id)

    return ExtendedAnalysisResponse(
        basic=basic_data,
        extension=extension,
    )


# ============================================
# Feedback Endpoints (피드백 수집)
# ============================================


@router.post(
    "/analysis/{analysis_id}/feedback",
    response_model=FeedbackResponse,
    status_code=status.HTTP_201_CREATED,
    summary="분석 결과 피드백 제출"
)
async def submit_feedback(
    analysis_id: str,
    feedback: FeedbackCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    """분석 결과에 대한 피드백을 제출합니다.

    - feedback_type: wrong_recognition, wrong_topic, wrong_difficulty, other
    - 데이터 활용 동의한 사용자의 피드백만 AI 개선에 활용됩니다.
    """
    # 분석 결과 소유권 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 피드백 저장
    new_feedback = Feedback(
        user_id=current_user.id,
        analysis_id=analysis_id,
        question_id=feedback.question_id,
        feedback_type=feedback.feedback_type,
        comment=feedback.comment,
    )
    db.add(new_feedback)
    await db.commit()
    await db.refresh(new_feedback)

    return FeedbackResponse.model_validate(new_feedback)
