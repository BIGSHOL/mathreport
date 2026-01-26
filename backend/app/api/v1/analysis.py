"""Analysis API endpoints using Supabase REST API."""
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Body

from app.core.deps import CurrentUser, DbDep
from app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisDetailResponse,
    AnalysisMetadata,
    AnalysisMergeRequest,
    AnalysisRequest,
    AnalysisResult as AnalysisResultSchema,
    AnalysisExtension as AnalysisExtensionSchema,
    ExtendedAnalysisResponse,
    ExportRequest,
    ExportResponse,
    ExamCommentary,
    TopicStrategiesResponse,
    ScoreLevelPlanResponse,
    ExamPrepStrategyResponse,
)
from app.schemas.feedback import FeedbackCreate, FeedbackResponse, BadgeEarned
from app.services.analysis import get_analysis_service
from app.services.agents import AnalysisOrchestrator
from app.services.subscription import get_subscription_service
from app.services.exam import get_exam_service
from app.services.ai_learning import get_ai_learning_service
from app.services.badge import get_badge_service

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
    db: DbDep,
) -> AnalysisCreateResponse:
    """시험지 분석을 요청합니다.

    - 사용량 한도를 체크하고 소비합니다.
    - questions_only: 1크레딧 (문항 분석만)
    - full: 2크레딧 (문항 + 정오답 분석)
    - 한도 초과 시 402 Payment Required 반환
    """
    # 시험지 조회하여 exam_type 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(exam_id, current_user["id"])

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다."
            }
        )

    # 사용량 체크 및 소비 (분석 모드에 따라 차등)
    # questions_only: 1크레딧, full: 2크레딧
    analysis_mode = request.analysis_mode
    effective_exam_type = "blank" if analysis_mode == "questions_only" else "student"

    # 기존 분석 결과 확인 (신뢰도 < 60%면 무료 재분석)
    skip_credit_check = False
    if request.force_reanalyze:
        # 기존 분석 조회
        analysis_service_temp = get_analysis_service(db)
        existing_analysis = await analysis_service_temp.get_analysis_by_exam(exam_id)

        if existing_analysis:
            # 신뢰도 확인 (avg_confidence < 0.6이면 무료 재분석)
            avg_confidence = existing_analysis.get("avg_confidence")
            if avg_confidence is not None and avg_confidence < 0.6:
                skip_credit_check = True
                print(f"[Reanalyze] 신뢰도 {avg_confidence:.0%} < 60% - 크레딧 차감 없이 재분석 허용")

    # 크레딧 체크 (신뢰도 낮은 재분석은 무료)
    credits_consumed = 0
    credits_remaining = 0

    if not skip_credit_check:
        subscription_service = get_subscription_service(db)
        consume_result = await subscription_service.consume_analysis(
            current_user["id"],
            exam_type=effective_exam_type,
            exam_id=exam_id
        )

        if not consume_result["success"]:
            credit_cost = 2 if analysis_mode == "full" else 1
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={
                    "code": "USAGE_LIMIT_EXCEEDED",
                    "message": f"이번 달 분석 한도를 초과했습니다. (필요: {credit_cost}크레딧) 구독을 업그레이드하거나 크레딧을 구매해주세요."
                }
            )

        credits_consumed = consume_result["credits_consumed"]
        credits_remaining = consume_result["credits_remaining"]

    analysis_service = get_analysis_service(db)
    result = await analysis_service.request_analysis(
        exam_id=exam_id,
        user_id=current_user["id"],
        force_reanalyze=request.force_reanalyze,
        analysis_mode=analysis_mode
    )

    # 크레딧 소비 정보 추가
    result["credits_consumed"] = credits_consumed
    result["credits_remaining"] = credits_remaining

    return AnalysisCreateResponse(data=result)


@router.post(
    "/exams/{exam_id}/analyze-answers",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="정오답 분석 추가 요청"
)
async def request_answer_analysis(
    exam_id: str,
    current_user: CurrentUser,
    db: DbDep,
) -> AnalysisCreateResponse:
    """기존 문항 분석에 정오답 분석을 추가합니다.

    - 기존 분석(questions_only)이 있어야 합니다.
    - 추가 1크레딧 소비
    - 학생 답안지(answered/mixed)에서만 의미있음
    """
    # 시험지 조회
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(exam_id, current_user["id"])

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다."
            }
        )

    # 이미 정오답 분석이 완료된 경우
    if exam.get("has_answer_analysis"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "ALREADY_ANALYZED",
                "message": "이미 정오답 분석이 완료되었습니다."
            }
        )

    # 기존 분석 결과 확인
    analysis_service = get_analysis_service(db)
    existing = await analysis_service.get_analysis_by_exam(exam_id)

    if not existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NO_BASE_ANALYSIS",
                "message": "먼저 문항 분석을 수행해주세요."
            }
        )

    # 사용량 체크 및 소비 (정오답 분석 = 1크레딧 추가)
    subscription_service = get_subscription_service(db)
    can_analyze = await subscription_service.consume_analysis(
        current_user["id"],
        exam_type="blank"  # 1크레딧
    )

    if not can_analyze:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "USAGE_LIMIT_EXCEEDED",
                "message": "이번 달 분석 한도를 초과했습니다. (필요: 1크레딧) 구독을 업그레이드하거나 크레딧을 구매해주세요."
            }
        )

    # 정오답 분석 수행 (answers_only 모드)
    result = await analysis_service.request_answer_analysis(
        exam_id=exam_id,
        user_id=current_user["id"],
        existing_analysis_id=existing["id"]
    )

    return AnalysisCreateResponse(data=result)


@router.get(
    "/exams/{exam_id}/analysis",
    summary="시험지의 분석 결과 ID 조회"
)
async def get_analysis_by_exam(
    exam_id: str,
    current_user: CurrentUser,
    db: DbDep,
):
    """시험지에 연결된 분석 결과 ID를 조회합니다."""
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis_by_exam(exam_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    return {"analysis_id": analysis["id"]}


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisDetailResponse,
    summary="분석 결과 조회"
)
async def get_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
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
    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    try:
        result_data = AnalysisResultSchema.model_validate(analysis)
    except Exception as e:
        print(f"[ERROR] Validation failed for analysis {analysis_id}: {e}")
        print(f"  Summary: {analysis.get('summary')}")
        print(f"  Questions: {analysis.get('questions')}")
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


@router.post(
    "/analysis/{analysis_id}/commentary",
    response_model=ExamCommentary,
    status_code=status.HTTP_201_CREATED,
    summary="AI 시험 총평 생성"
)
async def generate_commentary(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
    force_regenerate: bool = False,
) -> ExamCommentary:
    """시험 분석 결과를 바탕으로 AI 총평을 생성합니다.

    - 전체 평가, 난이도 균형, 문항 품질, 핵심 인사이트, 개선 권장사항 생성
    - 답안지인 경우 학습 가이던스도 포함
    - 기존 총평이 있으면 재사용 (force_regenerate=True로 재생성 가능)
    - 크레딧 소모 없음 (기존 분석 결과 활용)
    """
    from app.services.agents.commentary_agent import get_commentary_agent

    # 분석 결과 조회 및 권한 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 기존 총평 확인
    if not force_regenerate and analysis.get("commentary"):
        # 기존 총평이 있으면 반환
        return ExamCommentary.model_validate(analysis["commentary"])

    # 시험지 유형 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(str(analysis["exam_id"]), current_user["id"])
    exam_type = exam.get("exam_type", "blank") if exam else "blank"

    # 총평 생성
    commentary_agent = get_commentary_agent()
    commentary = commentary_agent.generate(
        analysis_result={
            "summary": analysis.get("summary"),
            "questions": analysis.get("questions"),
            "total_questions": analysis.get("total_questions"),
        },
        exam_type=exam_type
    )

    # 분석 결과에 총평 저장
    commentary_dict = commentary.model_dump()
    await db.table("analysis_results").eq("id", analysis_id).update({
        "commentary": commentary_dict
    }).execute()

    return commentary


@router.post(
    "/analysis/{analysis_id}/topic-strategies",
    response_model=TopicStrategiesResponse,
    status_code=status.HTTP_201_CREATED,
    summary="영역별 학습 전략 생성"
)
async def generate_topic_strategies(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
) -> TopicStrategiesResponse:
    """학생의 취약 단원을 분석하여 단원별 맞춤 학습 전략을 생성합니다.

    - 오답이 있는 단원별로 구체적인 학습 전략 제공
    - 학습 방법, 핵심 개념, 문제 풀이 팁, 흔한 실수, 추천 자료, 진도 체크리스트 포함
    - 전반적인 학습 가이드와 권장 학습 순서 제공
    - 답안지 분석에만 적용 가능 (빈 시험지는 불가)
    - 크레딧 소모 없음 (기존 분석 결과 활용)
    """
    from app.services.agents.topic_strategy_agent import get_topic_strategy_agent

    # 분석 결과 조회 및 권한 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # 시험지 유형 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(analysis["exam_id"])
    exam_type = exam.get("exam_type", "blank") if exam else "blank"

    if exam_type == "blank":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topic strategies are only available for answered exams (학생 답안지만 가능)"
        )

    # 학습 전략 생성
    strategy_agent = get_topic_strategy_agent()
    strategies_data = strategy_agent.generate(
        analysis_data={
            "questions": analysis.get("questions", []),
            "summary": analysis.get("summary"),
            "exam_type": exam_type,
        }
    )

    # 응답 구성
    from datetime import datetime
    return TopicStrategiesResponse(
        analysis_id=analysis_id,
        strategies=strategies_data["strategies"],
        overall_guidance=strategies_data["overall_guidance"],
        study_sequence=strategies_data["study_sequence"],
        generated_at=datetime.utcnow().isoformat()
    )


@router.post(
    "/analysis/{analysis_id}/score-level-plan",
    response_model=ScoreLevelPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="점수대별 맞춤 학습 계획 생성"
)
async def generate_score_level_plan(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
) -> ScoreLevelPlanResponse:
    """학생의 현재 점수를 분석하여 점수대별 맞춤 학습 계획을 생성합니다.

    - 현재 점수대 특성 분석 (강점, 약점, 전형적 실수)
    - 향상 목표 및 예상 기간 제시
    - 단계별 학습 계획 (기초 다지기 → 실력 향상 등)
    - 일일 학습 루틴 권장
    - 격려 메시지 포함
    - 답안지 분석에만 적용 가능 (빈 시험지는 불가)
    - 크레딧 소모 없음 (기존 분석 결과 활용)
    """
    from app.services.agents.score_level_plan_agent import get_score_level_plan_agent

    # 분석 결과 조회 및 권한 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # 시험지 유형 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(analysis["exam_id"])
    exam_type = exam.get("exam_type", "blank") if exam else "blank"

    if exam_type == "blank":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Score level plan is only available for answered exams (학생 답안지만 가능)"
        )

    # 현재 점수 계산
    questions = analysis.get("questions", [])
    current_score = sum(q.get("earned_points", 0) for q in questions if q.get("earned_points") is not None)
    total_score = sum(q.get("points", 0) for q in questions if q.get("points") is not None and q.get("points", 0) > 0)

    if total_score == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate score level plan: total score is 0"
        )

    # 점수대별 학습 계획 생성
    plan_agent = get_score_level_plan_agent()
    plan_data = plan_agent.generate(
        analysis_data={
            "current_score": current_score,
            "total_score": total_score,
            "questions": questions,
            "summary": analysis.get("summary"),
        }
    )

    # 응답 구성
    from datetime import datetime
    return ScoreLevelPlanResponse(
        analysis_id=analysis_id,
        current_score=plan_data["current_score"],
        total_score=plan_data["total_score"],
        score_percentage=plan_data["score_percentage"],
        characteristics=plan_data["characteristics"],
        improvement_goal=plan_data["improvement_goal"],
        study_phases=plan_data["study_phases"],
        daily_routine=plan_data["daily_routine"],
        motivational_message=plan_data["motivational_message"],
        generated_at=datetime.utcnow().isoformat()
    )


@router.post(
    "/analysis/{analysis_id}/exam-prep-strategy",
    response_model=ExamPrepStrategyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="자기 시험 대비 전략 생성"
)
async def generate_exam_prep_strategy(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
    exam_name: str = Body(..., description="시험 이름 (예: '중간고사')"),
    days_until_exam: int = Body(..., ge=1, le=30, description="시험까지 남은 일수 (1-30일)"),
) -> ExamPrepStrategyResponse:
    """앞으로 있을 시험을 대비한 맞춤 전략을 생성합니다.

    - 우선 학습 영역 선정 (취약 단원 중심)
    - D-day별 학습 계획 (D-7, D-3, D-1, D-day 등)
    - 시험 당일 전략 (시험 전/중/후 팁)
    - 시간 관리 및 긴장 완화 방법
    - 답안지 분석에만 적용 가능 (빈 시험지는 불가)
    - 크레딧 소모 없음 (기존 분석 결과 활용)
    """
    from app.services.agents.exam_prep_strategy_agent import get_exam_prep_strategy_agent

    # 분석 결과 조회 및 권한 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # 시험지 유형 확인
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(analysis["exam_id"])
    exam_type = exam.get("exam_type", "blank") if exam else "blank"

    if exam_type == "blank":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam prep strategy is only available for answered exams (학생 답안지만 가능)"
        )

    # 현재 점수 계산
    questions = analysis.get("questions", [])
    current_score = sum(q.get("earned_points", 0) for q in questions if q.get("earned_points") is not None)
    total_score = sum(q.get("points", 0) for q in questions if q.get("points") is not None and q.get("points", 0) > 0)

    # 시험 대비 전략 생성
    strategy_agent = get_exam_prep_strategy_agent()
    strategy_data = strategy_agent.generate(
        analysis_data={
            "questions": questions,
            "summary": analysis.get("summary"),
            "current_score": current_score,
            "total_score": total_score,
        },
        exam_name=exam_name,
        days_until_exam=days_until_exam
    )

    # 응답 구성
    from datetime import datetime
    return ExamPrepStrategyResponse(
        analysis_id=analysis_id,
        exam_name=strategy_data["exam_name"],
        days_until_exam=strategy_data["days_until_exam"],
        target_score_improvement=strategy_data["target_score_improvement"],
        priority_areas=strategy_data["priority_areas"],
        daily_plans=strategy_data["daily_plans"],
        exam_day_strategy=strategy_data["exam_day_strategy"],
        final_advice=strategy_data["final_advice"],
        generated_at=datetime.utcnow().isoformat()
    )


@router.patch(
    "/analysis/{analysis_id}/answers",
    summary="정오답 수동 수정"
)
async def update_answers(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
    updates: dict = Body(..., description="question_id -> is_correct (boolean | null) 매핑")
):
    """
    AI가 잘못 판별한 정오답을 학부모/선생님이 직접 수정합니다.

    Args:
        analysis_id: 분석 결과 ID
        updates: { "question_id": true/false/null } 형식의 업데이트 데이터

    Returns:
        업데이트된 문항 수
    """
    from app.db import get_db

    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    # Check ownership
    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 정오답 업데이트
    updated_count = 0
    questions = analysis.get("questions", [])

    for question in questions:
        question_id = question.get("id")
        if question_id in updates:
            new_value = updates[question_id]
            # boolean이거나 null이어야 함
            if new_value is not None and not isinstance(new_value, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "INVALID_VALUE", "message": f"잘못된 값: {new_value}. true/false/null만 가능합니다."}
                )

            question["is_correct"] = new_value

            # earned_points 재계산 (is_correct가 true이면 만점, false이면 0점)
            if new_value is True:
                question["earned_points"] = question.get("points", 0)
            elif new_value is False:
                question["earned_points"] = 0.0
            else:
                question["earned_points"] = None

            updated_count += 1

    # DB 업데이트
    db_instance = get_db()
    await db_instance.analysis.update_one(
        {"id": analysis_id},
        {"$set": {"questions": questions}}
    )

    return {
        "success": True,
        "updated_count": updated_count,
        "message": f"{updated_count}개 문항이 수정되었습니다."
    }


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
    db: DbDep,
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

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 시험지 유형 확인 (빈 시험지는 확장 분석 불가)
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(str(analysis["exam_id"]), current_user["id"])

    if exam and exam["exam_type"] == "blank":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "BLANK_EXAM_NOT_SUPPORTED",
                "message": "빈 시험지는 확장 분석을 사용할 수 없습니다. 학생 답안지를 업로드해주세요."
            }
        )

    # 사용량 체크 및 소비
    subscription_service = get_subscription_service(db)
    can_use_extended = await subscription_service.consume_extended(current_user["id"])

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
            user_id=current_user["id"],
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
    response_model=AnalysisExtensionSchema | None,
    summary="확장 분석 조회"
)
async def get_extended_analysis(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
) -> AnalysisExtensionSchema | None:
    """저장된 확장 분석을 조회합니다."""
    # 기본 분석 소유권 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    orchestrator = AnalysisOrchestrator(db)
    extension = await orchestrator.get_extended_analysis(analysis_id)

    # 404 대신 None 반환 (프론트엔드 콘솔 에러 방지)
    return extension


@router.get(
    "/analysis/{analysis_id}/report",
    response_model=ExtendedAnalysisResponse,
    summary="4단계 통합 보고서 조회"
)
async def get_full_report(
    analysis_id: str,
    current_user: CurrentUser,
    db: DbDep,
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

    if analysis["user_id"] != current_user["id"]:
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
    db: DbDep,
) -> FeedbackResponse:
    """분석 결과에 대한 피드백을 제출합니다.

    - feedback_type: wrong_recognition, wrong_topic, wrong_difficulty, wrong_grading, other
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

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 피드백 저장
    now = datetime.utcnow().isoformat()
    feedback_data = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "analysis_id": analysis_id,
        "question_id": feedback.question_id,
        "feedback_type": feedback.feedback_type,
        "comment": feedback.comment,
        "created_at": now,
        "updated_at": now,
    }

    result = await db.table("feedbacks").insert(feedback_data).execute()

    if result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DB_ERROR", "message": f"피드백 저장 실패: {result.error}"}
        )

    # Analytics 로깅: 피드백 제출
    try:
        from app.services.analytics_log import get_analytics_log_service
        analytics = get_analytics_log_service(db)
        await analytics.log_feedback(
            user_id=current_user["id"],
            analysis_id=analysis_id,
            question_id=feedback.question_id,
            feedback_type=feedback.feedback_type,
            feedback_value={"comment": feedback.comment} if feedback.comment else None,
        )
    except Exception as log_error:
        print(f"[Analytics Log Error] {log_error}")

    # 자동 학습 트리거 (피드백 10개 이상 쌓이면 자동 분석)
    try:
        learning_service = get_ai_learning_service(db)
        learn_result = await learning_service.check_and_auto_learn(threshold=10)
        if learn_result:
            print(f"[Feedback] 자동 학습 완료: {learn_result.get('auto_applied', 0)}개 패턴 적용")
    except Exception as e:
        # 학습 실패해도 피드백 저장은 성공으로 처리
        print(f"[Feedback] 자동 학습 실패 (무시됨): {e}")

    # 배지 지급 체크
    badge_earned = None
    try:
        badge_service = get_badge_service(db)
        new_badge = await badge_service.increment_feedback_count(current_user["id"])
        if new_badge:
            badge_earned = BadgeEarned(
                id=new_badge["id"],
                name=new_badge["name"],
                icon=new_badge["icon"],
                description=new_badge["description"],
                tier=new_badge["tier"],
            )
            print(f"[Badge] 사용자 {current_user['id']}에게 '{new_badge['name']}' 배지 지급")
    except Exception as e:
        print(f"[Badge] 배지 지급 실패 (무시됨): {e}")

    response_data = result.data
    response_data["badge_earned"] = badge_earned
    return FeedbackResponse.model_validate(response_data)


# ============================================
# Analysis Merge Endpoints (분석 병합)
# ============================================


@router.post(
    "/analyses/merge",
    response_model=AnalysisDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="여러 분석 결과 병합"
)
async def merge_analyses(
    request: AnalysisMergeRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> AnalysisDetailResponse:
    """여러 분석 결과를 하나로 병합합니다.

    - 최소 2개 이상의 분석 ID 필요
    - 모든 분석이 completed 상태여야 함
    - 문항 번호는 순서대로 재배정됨
    - 크레딧 소모 없음 (이미 분석된 결과 병합)
    """
    analysis_service = get_analysis_service(db)

    # 모든 분석 조회 및 권한 확인
    analyses = []
    for analysis_id in request.analysis_ids:
        analysis = await analysis_service.get_analysis(analysis_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={
                    "code": "ANALYSIS_NOT_FOUND",
                    "message": f"분석 결과를 찾을 수 없습니다: {analysis_id}"
                }
            )

        if analysis["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
            )

        analyses.append(analysis)

    # 병합 실행
    merged = await analysis_service.merge_analyses(
        analyses=analyses,
        user_id=current_user["id"],
        title=request.title
    )

    result_data = AnalysisResultSchema.model_validate(merged)

    return AnalysisDetailResponse(
        data=result_data,
        meta=AnalysisMetadata(cache_hit=False, analysis_duration=0)
    )


# ============================================
# Export Endpoints (내보내기)
# ============================================


@router.post(
    "/analysis/{analysis_id}/export",
    response_model=ExportResponse,
    status_code=status.HTTP_200_OK,
    summary="분석 보고서 내보내기"
)
async def export_analysis(
    analysis_id: str,
    request: ExportRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> ExportResponse:
    """분석 결과를 HTML로 내보냅니다.

    - 1 크레딧 소모
    - 선택한 섹션만 포함: header, summary, difficulty, type, topic, scores, questions, comments
    """
    # 분석 결과 소유권 확인
    analysis_service = get_analysis_service(db)
    analysis = await analysis_service.get_analysis(analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "ANALYSIS_NOT_FOUND", "message": "분석 결과를 찾을 수 없습니다."}
        )

    if analysis["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "접근 권한이 없습니다."}
        )

    # 크레딧 소비
    subscription_service = get_subscription_service(db)
    can_export = await subscription_service.consume_export(current_user["id"], analysis["exam_id"])

    if not can_export:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "code": "INSUFFICIENT_CREDITS",
                "message": "내보내기에는 1크레딧이 필요합니다. 크레딧을 구매해주세요."
            }
        )

    # Analytics 로깅: 내보내기
    try:
        from app.services.analytics_log import get_analytics_log_service
        analytics = get_analytics_log_service(db)
        await analytics.log_export(
            user_id=current_user["id"],
            analysis_id=analysis_id,
            export_format="html",
            sections=request.sections,
        )
    except Exception as log_error:
        print(f"[Analytics Log Error] {log_error}")

    # HTML 생성
    html = generate_export_html(
        analysis=analysis,
        sections=request.sections,
        exam_title=request.exam_title or "시험지",
        exam_grade=request.exam_grade,
        exam_subject=request.exam_subject or "수학"
    )

    # 파일명 생성
    title = request.exam_title or "분석보고서"
    date_str = datetime.now().strftime("%Y%m%d")
    filename = f"{title}_{date_str}.html"

    return ExportResponse(
        success=True,
        html=html,
        image_url=None,
        filename=filename
    )


def generate_export_html(
    analysis: dict,
    sections: list[str],
    exam_title: str,
    exam_grade: str | None,
    exam_subject: str
) -> str:
    """분석 결과를 HTML로 생성합니다."""
    questions = analysis.get("questions", [])
    total_questions = analysis.get("total_questions", len(questions))
    analyzed_at = analysis.get("analyzed_at", "")

    # 통계 계산
    total_points = round(sum(q.get("points", 0) or 0 for q in questions), 1)

    diff_dist = {
        "high": len([q for q in questions if q.get("difficulty") == "high"]),
        "medium": len([q for q in questions if q.get("difficulty") == "medium"]),
        "low": len([q for q in questions if q.get("difficulty") == "low"]),
    }

    type_dist = {}
    for q in questions:
        qtype = q.get("question_type", "other")
        type_dist[qtype] = type_dist.get(qtype, 0) + 1

    topic_dist = {}
    for q in questions:
        topic = (q.get("topic") or "미분류").split(" > ")[0]
        topic_dist[topic] = topic_dist.get(topic, 0) + 1

    # 평균 난이도
    total_diff = diff_dist["high"] + diff_dist["medium"] + diff_dist["low"]
    if total_diff > 0:
        diff_score = (diff_dist["high"] * 3 + diff_dist["medium"] * 2 + diff_dist["low"]) / total_diff
        avg_diff = "상" if diff_score >= 2.5 else ("중" if diff_score >= 1.5 else "하")
    else:
        avg_diff = "-"

    # 정답률 (답안지인 경우)
    answered_qs = [q for q in questions if q.get("is_correct") is not None]
    correct_count = len([q for q in answered_qs if q.get("is_correct")])
    correct_rate = round((correct_count / len(answered_qs) * 100) if answered_qs else 0)
    earned_points = round(sum(q.get("earned_points", 0) or 0 for q in questions), 1)
    is_answered = len(answered_qs) > 0

    # 유형 한글 매핑
    type_labels = {
        "calculation": "계산", "geometry": "도형", "application": "응용",
        "proof": "증명", "graph": "그래프", "statistics": "통계"
    }

    # 난이도 색상
    diff_colors = {"high": "#dc2626", "medium": "#f59e0b", "low": "#22c55e"}

    # HTML 생성
    html_parts = ["""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>분석 보고서</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Pretendard Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9pt; line-height: 1.4; color: #1f2937; background: white; }
.page { width: 210mm; min-height: 297mm; max-height: 297mm; margin: 0 auto; padding: 10mm; overflow: hidden; }
.header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 12px; }
.header h1 { font-size: 18px; color: #312e81; }
.header .meta { font-size: 10px; color: #6b7280; margin-top: 4px; }
.two-column { display: flex; gap: 16px; }
.column { flex: 1; }
.section-row { display: flex; gap: 8px; margin-bottom: 8px; }
.section-row .section { flex: 1; margin-bottom: 0; }
.section { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
.section-title { font-size: 10px; font-weight: 600; color: #374151; margin-bottom: 6px; }
.summary-box { background: #eef2ff; border-radius: 6px; padding: 8px; margin-bottom: 8px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center; }
.summary-item .value { font-size: 16px; font-weight: 700; color: #4f46e5; }
.summary-item .label { font-size: 9px; color: #6b7280; }
.diff-bar { display: flex; height: 16px; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.diff-bar div { display: flex; align-items: center; justify-content: center; color: white; font-size: 9px; }
.diff-legend { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; }
.type-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.type-tag { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 9px; }
.topic-list { font-size: 9px; }
.topic-row { display: flex; justify-content: space-between; padding: 2px 0; }
.topic-name { color: #6b7280; }
.topic-count { color: #4f46e5; font-weight: 500; }
table { width: 100%; border-collapse: collapse; font-size: 9px; }
th { text-align: left; padding: 4px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500; }
td { padding: 4px; border-bottom: 1px solid #f3f4f6; }
.diff-badge { display: inline-block; width: 16px; height: 16px; border-radius: 4px; color: white; text-align: center; line-height: 16px; font-size: 9px; }
.correct { color: #22c55e; }
.wrong { color: #dc2626; }
.score-box { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 8px; }
.score-earned { font-size: 24px; font-weight: 700; color: #4f46e5; }
.score-total { font-size: 16px; color: #6b7280; }
.comments { margin-top: 8px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
.comment-item { display: flex; gap: 4px; font-size: 9px; margin-bottom: 4px; }
.comment-num { color: #4f46e5; font-weight: 500; }
.comment-text { color: #6b7280; }
.footer { margin-top: auto; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #9ca3af; }
</style>
</head>
<body>
<div class="page">
"""]

    # Header
    if "header" in sections:
        meta_parts = []
        if exam_grade:
            meta_parts.append(exam_grade)
        meta_parts.append(exam_subject)
        if analyzed_at:
            try:
                date_obj = datetime.fromisoformat(analyzed_at.replace("Z", "+00:00").replace("+00:00", ""))
                meta_parts.append(date_obj.strftime("%Y-%m-%d"))
            except Exception:
                pass

        html_parts.append(f"""
<div class="header">
<h1>{exam_title}</h1>
<div class="meta">{" · ".join(meta_parts)}</div>
</div>
""")

    # Summary
    if "summary" in sections:
        html_parts.append(f"""
<div class="summary-box">
<div class="summary-grid">
<div class="summary-item"><div class="value">{total_questions}</div><div class="label">문항</div></div>
<div class="summary-item"><div class="value">{total_points}</div><div class="label">총점</div></div>
<div class="summary-item"><div class="value">{avg_diff}</div><div class="label">난이도</div></div>
""")
        if is_answered and "scores" in sections:
            html_parts.append(f'<div class="summary-item"><div class="value" style="color: #22c55e;">{correct_rate}%</div><div class="label">정답률</div></div>')
        html_parts.append("</div></div>")

    # Two column layout
    html_parts.append('<div class="two-column"><div class="column">')

    # Scores (answered only)
    if "scores" in sections and is_answered:
        html_parts.append(f"""
<div class="section">
<div class="section-title">점수</div>
<div class="score-box">
<span class="score-earned">{earned_points}</span>
<span class="score-total">/ {total_points} 점</span>
</div>
</div>
""")

    # Difficulty distribution
    if "difficulty" in sections:
        total = diff_dist["high"] + diff_dist["medium"] + diff_dist["low"]
        low_pct = (diff_dist["low"] / total * 100) if total > 0 else 0
        med_pct = (diff_dist["medium"] / total * 100) if total > 0 else 0
        high_pct = (diff_dist["high"] / total * 100) if total > 0 else 0

        html_parts.append(f"""
<div class="section">
<div class="section-title">난이도 분포</div>
<div class="diff-bar">
""")
        if diff_dist["low"] > 0:
            html_parts.append(f'<div style="width: {low_pct}%; background: {diff_colors["low"]};">{diff_dist["low"]}</div>')
        if diff_dist["medium"] > 0:
            html_parts.append(f'<div style="width: {med_pct}%; background: {diff_colors["medium"]};">{diff_dist["medium"]}</div>')
        if diff_dist["high"] > 0:
            html_parts.append(f'<div style="width: {high_pct}%; background: {diff_colors["high"]};">{diff_dist["high"]}</div>')

        html_parts.append(f"""
</div>
<div class="diff-legend">
<span>하 {diff_dist["low"]}</span>
<span>중 {diff_dist["medium"]}</span>
<span>상 {diff_dist["high"]}</span>
</div>
</div>
""")

    # Type & Topic distribution (2-column row)
    if "type" in sections or "topic" in sections:
        html_parts.append('<div class="section-row">')

        # Type distribution
        if "type" in sections:
            html_parts.append("""
<div class="section">
<div class="section-title">유형 분포</div>
<div class="type-tags">
""")
            for qtype, count in sorted(type_dist.items(), key=lambda x: -x[1])[:6]:
                label = type_labels.get(qtype, qtype)
                html_parts.append(f'<span class="type-tag">{label} {count}</span>')
            html_parts.append("</div></div>")

        # Topic distribution
        if "topic" in sections:
            html_parts.append("""
<div class="section">
<div class="section-title">단원 분포</div>
<div class="topic-list">
""")
            for topic, count in sorted(topic_dist.items(), key=lambda x: -x[1])[:5]:
                html_parts.append(f'<div class="topic-row"><span class="topic-name">{topic}</span><span class="topic-count">{count}</span></div>')
            html_parts.append("</div></div>")

        html_parts.append('</div>')  # Close section-row

    html_parts.append('</div><div class="column">')

    # Questions table
    if "questions" in sections:
        html_parts.append("""
<div class="section">
<div class="section-title">문항별 분석</div>
<table>
<thead><tr>
<th>번호</th>
<th style="text-align: center;">난이도</th>
<th style="text-align: center;">배점</th>
<th>단원</th>
""")
        if is_answered:
            html_parts.append('<th style="text-align: center;">정답</th>')
        html_parts.append("</tr></thead><tbody>")

        for q in questions[:20]:
            diff = q.get("difficulty", "medium")
            diff_label = "상" if diff == "high" else ("중" if diff == "medium" else "하")
            topic = (q.get("topic") or "-").split(" > ")[-1]

            html_parts.append(f"""
<tr>
<td style="font-weight: 500;">{q.get("question_number", "-")}</td>
<td style="text-align: center;"><span class="diff-badge" style="background: {diff_colors.get(diff, '#6b7280')};">{diff_label}</span></td>
<td style="text-align: center; color: #6b7280;">{q.get("points", "-")}</td>
<td style="max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #6b7280;">{topic}</td>
""")
            if is_answered:
                is_correct = q.get("is_correct")
                if is_correct is True:
                    html_parts.append('<td style="text-align: center;" class="correct">O</td>')
                elif is_correct is False:
                    html_parts.append('<td style="text-align: center;" class="wrong">X</td>')
                else:
                    html_parts.append('<td style="text-align: center; color: #9ca3af;">-</td>')
            html_parts.append("</tr>")

        html_parts.append("</tbody></table>")
        if len(questions) > 20:
            html_parts.append(f'<div style="text-align: center; font-size: 9px; color: #9ca3af; margin-top: 4px;">... 외 {len(questions) - 20}문항</div>')
        html_parts.append("</div>")

    html_parts.append('</div></div>')  # Close two columns

    # Comments
    if "comments" in sections:
        comments = [q for q in questions if q.get("ai_comment")][:3]
        if comments:
            html_parts.append("""
<div class="comments">
<div class="section-title">AI 분석 코멘트</div>
""")
            for q in comments:
                html_parts.append(f'<div class="comment-item"><span class="comment-num">{q.get("question_number")}번:</span><span class="comment-text">{q.get("ai_comment", "")}</span></div>')
            html_parts.append("</div>")

    # Footer
    html_parts.append("""
<div class="footer">Powered by AI 시험지 분석</div>
</div>
</body>
</html>
""")

    return "".join(html_parts)
