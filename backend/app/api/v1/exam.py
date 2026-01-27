"""Exam API endpoints using Supabase REST API."""
import math
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbDep
from app.db.supabase_client import SupabaseClient
from app.schemas.exam import (
    AnalysisBrief,
    ExamBase,
    ExamCreateRequest,
    ExamCreateResponse,
    ExamDeleteResponse,
    ExamDetail,
    ExamDetailResponse,
    ExamListResponse,
    ExamStatus,
    ExamType,
    ExamWithBrief,
    PaginationMeta,
)
from app.services.exam import get_exam_service

router = APIRouter(prefix="/exams", tags=["exams"])


@router.post(
    "",
    response_model=ExamCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="시험지 업로드"
)
async def upload_exam(
    files: Annotated[list[UploadFile], File(description="시험지 파일")],
    title: Annotated[str, Form()],
    subject: Annotated[str, Form()] = "수학",
    grade: Annotated[str | None, Form()] = None,
    unit: Annotated[str | None, Form()] = None,
    category: Annotated[str | None, Form()] = None,  # 세부 과목 (공통수학1, 공통수학2 등)
    school_name: Annotated[str | None, Form()] = None,
    school_region: Annotated[str | None, Form()] = None,
    school_type: Annotated[str | None, Form()] = None,
    exam_scope: Annotated[str | None, Form()] = None,  # JSON 배열 문자열
    exam_type: Annotated[str, Form()] = "blank",
    current_user: CurrentUser = None,
    db: DbDep = None,
    background_tasks: BackgroundTasks = None,
) -> ExamCreateResponse:
    """시험지 파일을 업로드합니다.

    - **files**: 이미지(JPG, PNG) 여러 장 또는 PDF 파일 1개 (최대 20MB)
    - **title**: 시험명 (필수)
    - **subject**: 과목 (기본값: 수학)
    - **grade**: 학년 (선택)
    - **unit**: 단원 (선택)
    - **category**: 세부 과목 (선택, 예: 공통수학1, 공통수학2, 대수, 미적분I)
    - **school_name**: 학교명 (선택)
    - **school_region**: 지역 (선택)
    - **school_type**: 학교 유형 (선택)
    - **exam_scope**: 출제범위 - 단원 목록 JSON 배열 (선택)
    - **exam_type**: 시험지 유형 (blank: 빈 시험지 1크레딧, student: 학생 답안지 2크레딧)

    Returns:
        업로드된 시험지 정보 (AI 자동 분류 결과는 백그라운드에서 업데이트됨)
    """
    import json

    # Parse exam_scope JSON if provided
    parsed_exam_scope = None
    if exam_scope:
        try:
            parsed_exam_scope = json.loads(exam_scope)
        except json.JSONDecodeError:
            pass  # Invalid JSON, ignore

    # Create request object from form data
    request = ExamCreateRequest(
        title=title,
        subject=subject,
        grade=grade,
        unit=unit,
        category=category,
        school_name=school_name,
        school_region=school_region,
        school_type=school_type,
        exam_scope=parsed_exam_scope,
        exam_type=ExamType(exam_type)
    )

    # Create exam (AI 분류 없이 즉시 저장 - 속도 최적화)
    # 시험지 유형 분류는 분석 요청 시 수행됨 (analyze_exam_with_patterns)
    exam_service = get_exam_service(db)
    exam = await exam_service.create_exam(
        user_id=current_user["id"],
        request=request,
        files=files
    )

    print(f"[Upload] Exam {exam['id']} uploaded (AI classification deferred to analysis)")

    # Convert to response
    exam_base = ExamBase.model_validate(exam)

    return ExamCreateResponse(
        data=exam_base,
        message="시험지가 성공적으로 업로드되었습니다."
    )


@router.get(
    "",
    response_model=ExamListResponse,
    summary="시험지 목록 조회"
)
async def get_exams(
    page: int = 1,
    page_size: int = 20,
    status: ExamStatus | None = None,
    current_user: CurrentUser = None,
    db: DbDep = None,
) -> ExamListResponse:
    """시험지 목록을 조회합니다 (페이지네이션).

    - **page**: 페이지 번호 (기본값: 1)
    - **page_size**: 페이지 크기 (기본값: 20, 최대: 100)
    - **status**: 상태 필터 (pending, analyzing, completed, failed)

    Returns:
        시험지 목록 및 페이지네이션 메타데이터
    """
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1:
        page_size = 1
    if page_size > 100:
        page_size = 100

    # Get exams
    exam_service = get_exam_service(db)
    exams, total = await exam_service.get_exams(
        user_id=current_user["id"],
        page=page,
        page_size=page_size,
        status_filter=status
    )

    # Get analysis briefs for completed exams
    completed_exam_ids = [str(e["id"]) for e in exams if e.get("status") == "completed"]
    analysis_map: dict[str, AnalysisBrief] = {}

    if completed_exam_ids:
        # Query analysis results for completed exams in a single batch query (N+1 fix)
        results = await db.table("analysis_results").select("*").in_("exam_id", completed_exam_ids).execute()

        for analysis in (results.data or []):
            exam_id = str(analysis.get("exam_id"))
            questions = analysis.get("questions") or []
            total_questions = len(questions)
            # 부동소수점 오류 방지: 소수점 1자리까지 반올림
            total_points = round(sum(q.get("points", 0) or 0 for q in questions), 1)

            # Calculate confidence
            confidences = [q.get("confidence") for q in questions if q.get("confidence") is not None]
            avg_confidence = sum(confidences) / len(confidences) if confidences else None

            # 배점 검증 기반 신뢰도 페널티 적용 (섹션 구분 시험지 예외 처리)
            if avg_confidence is not None:
                points_diff = abs(100 - total_points)

                # 섹션 구분 시험지 감지 (예: 객관식 100점 + 서술형 100점 = 200점)
                is_sectioned_exam = False
                if total_points % 100 == 0 and total_points >= 200:
                    # 문항 유형별 배점 합계 계산
                    essay_points = sum(q.get("points", 0) for q in questions if q.get("question_format") == "essay")
                    non_essay_points = sum(q.get("points", 0) for q in questions if q.get("question_format") != "essay")

                    # 각 섹션이 100의 배수로 명확히 구분되면 정상 시험지로 간주
                    if (essay_points % 100 == 0 and essay_points >= 100) or \
                       (non_essay_points % 100 == 0 and non_essay_points >= 100):
                        is_sectioned_exam = True

                # 섹션 구분 시험지는 페널티 면제
                if is_sectioned_exam:
                    pass
                elif points_diff <= 5:
                    # 95~105점: 페널티 없음
                    pass
                elif points_diff <= 15:
                    # 85~94점 또는 106~115점: 20% 감소
                    avg_confidence *= 0.8
                elif points_diff <= 25:
                    # 75~84점 또는 116~125점: 40% 감소
                    avg_confidence *= 0.6
                elif points_diff <= 50:
                    # 50~74점 또는 126~150점: 60% 감소
                    avg_confidence *= 0.4
                else:
                    # 50점 미만 또는 150점 초과: 80% 감소 (거의 확실한 오분석)
                    avg_confidence *= 0.2

            # Calculate difficulty distribution (4단계 + 3단계 하위호환)
            # 4단계 시스템
            diff_concept = sum(1 for q in questions if q.get("difficulty") == "concept")
            diff_pattern = sum(1 for q in questions if q.get("difficulty") == "pattern")
            diff_reasoning = sum(1 for q in questions if q.get("difficulty") == "reasoning")
            diff_creative = sum(1 for q in questions if q.get("difficulty") == "creative")

            # 3단계 시스템 (하위 호환)
            diff_high = sum(1 for q in questions if q.get("difficulty") == "high")
            diff_medium = sum(1 for q in questions if q.get("difficulty") == "medium")
            diff_low = sum(1 for q in questions if q.get("difficulty") == "low")

            # Calculate format distribution (서술형 개수)
            format_essay = sum(1 for q in questions if q.get("question_format") == "essay")

            analysis_map[exam_id] = AnalysisBrief(
                total_questions=total_questions,
                total_points=total_points,
                avg_confidence=avg_confidence,
                difficulty_concept=diff_concept,
                difficulty_pattern=diff_pattern,
                difficulty_reasoning=diff_reasoning,
                difficulty_creative=diff_creative,
                difficulty_high=diff_high,
                difficulty_medium=diff_medium,
                difficulty_low=diff_low,
                format_essay=format_essay,
            )

    # Convert to response with briefs
    exam_list = []
    for exam in exams:
        exam_with_brief = ExamWithBrief.model_validate(exam)
        exam_with_brief.analysis_brief = analysis_map.get(str(exam["id"]))
        exam_list.append(exam_with_brief)

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return ExamListResponse(
        data=exam_list,
        meta=PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    )


@router.get(
    "/{exam_id}",
    response_model=ExamDetailResponse,
    summary="시험지 상세 조회"
)
async def get_exam(
    exam_id: str,
    current_user: CurrentUser = None,
    db: DbDep = None,
) -> ExamDetailResponse:
    """시험지 상세 정보를 조회합니다.

    - **exam_id**: 시험지 ID

    Returns:
        시험지 상세 정보 (분석 완료 시 analysis 포함)
    """
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(exam_id, current_user["id"])

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다.",
            }
        )

    # Convert to response (without analysis for now)
    exam_detail = ExamDetail.model_validate(exam)

    return ExamDetailResponse(data=exam_detail)


class UpdateExamTypeRequest(BaseModel):
    """PATCH /exams/{exam_id}/type 요청"""
    exam_type: str


class UpdateExamTypeResponse(BaseModel):
    """PATCH /exams/{exam_id}/type 응답"""
    success: bool
    exam_type: str


@router.patch(
    "/{exam_id}/type",
    response_model=UpdateExamTypeResponse,
    summary="시험지 유형 변경"
)
async def update_exam_type(
    exam_id: str,
    request: UpdateExamTypeRequest,
    current_user: CurrentUser = None,
    db: DbDep = None,
) -> UpdateExamTypeResponse:
    """시험지 유형을 변경합니다 (분석 전에 사용).

    - **exam_id**: 시험지 ID
    - **exam_type**: 새 유형 (blank 또는 student)

    Returns:
        변경된 유형 정보
    """
    if request.exam_type not in ["blank", "student"]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "code": "INVALID_EXAM_TYPE",
                "message": "유효하지 않은 시험지 유형입니다.",
                "details": [{"field": "exam_type", "reason": "blank 또는 student만 허용됩니다."}]
            }
        )

    exam_service = get_exam_service(db)
    exam = await exam_service.update_exam_type(exam_id, current_user["id"], request.exam_type)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다.",
            }
        )

    return UpdateExamTypeResponse(success=True, exam_type=exam["exam_type"])


@router.delete(
    "/{exam_id}",
    response_model=ExamDeleteResponse,
    summary="시험지 삭제"
)
async def delete_exam(
    exam_id: str,
    current_user: CurrentUser = None,
    db: DbDep = None,
) -> ExamDeleteResponse:
    """시험지를 삭제합니다.

    - **exam_id**: 시험지 ID

    Returns:
        삭제 완료 메시지
    """
    exam_service = get_exam_service(db)
    deleted = await exam_service.delete_exam(exam_id, current_user["id"])

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다.",
            }
        )

    return ExamDeleteResponse(message="시험지가 성공적으로 삭제되었습니다.")
