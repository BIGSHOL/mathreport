"""Exam API endpoints."""
import math
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.schemas.exam import (
    ExamBase,
    ExamCreateRequest,
    ExamCreateResponse,
    ExamDeleteResponse,
    ExamDetail,
    ExamDetailResponse,
    ExamListResponse,
    ExamStatus,
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
    title: Annotated[str, Form()],
    subject: Annotated[str, Form()] = "수학",
    grade: Annotated[str | None, Form()] = None,
    unit: Annotated[str | None, Form()] = None,
    file: UploadFile = File(...),
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> ExamCreateResponse:
    """시험지 파일을 업로드합니다.

    - **file**: 이미지(JPG, PNG) 또는 PDF 파일 (최대 10MB)
    - **title**: 시험명 (필수)
    - **subject**: 과목 (기본값: 수학)
    - **grade**: 학년 (선택)
    - **unit**: 단원 (선택)

    Returns:
        업로드된 시험지 정보
    """
    # Create request object from form data
    request = ExamCreateRequest(
        title=title,
        subject=subject,
        grade=grade,
        unit=unit
    )

    # Create exam
    exam_service = get_exam_service(db)
    exam = await exam_service.create_exam(
        user_id=current_user.id,
        request=request,
        file=file
    )

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
    db: AsyncSession = Depends(get_db),
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
        user_id=current_user.id,
        page=page,
        page_size=page_size,
        status_filter=status
    )

    # Convert to response
    exam_list = [ExamBase.model_validate(exam) for exam in exams]
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
    db: AsyncSession = Depends(get_db),
) -> ExamDetailResponse:
    """시험지 상세 정보를 조회합니다.

    - **exam_id**: 시험지 ID

    Returns:
        시험지 상세 정보 (분석 완료 시 analysis 포함)
    """
    exam_service = get_exam_service(db)
    exam = await exam_service.get_exam(exam_id, current_user.id)

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


@router.delete(
    "/{exam_id}",
    response_model=ExamDeleteResponse,
    summary="시험지 삭제"
)
async def delete_exam(
    exam_id: str,
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> ExamDeleteResponse:
    """시험지를 삭제합니다.

    - **exam_id**: 시험지 ID

    Returns:
        삭제 완료 메시지
    """
    exam_service = get_exam_service(db)
    deleted = await exam_service.delete_exam(exam_id, current_user.id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "EXAM_NOT_FOUND",
                "message": "시험지를 찾을 수 없습니다.",
            }
        )

    return ExamDeleteResponse(message="시험지가 성공적으로 삭제되었습니다.")
