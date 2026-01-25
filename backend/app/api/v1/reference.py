"""
Question Reference Management API
문제 레퍼런스 자동 수집 및 관리자 검토 엔드포인트
"""
from typing import Annotated
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser
from app.db.session import get_db
from app.models.reference import QuestionReference, ReviewStatus
from app.schemas.reference import (
    QuestionReferenceResponse,
    QuestionReferenceDetail,
    ReferenceReviewRequest,
    ReferenceStats,
    ReferenceListResponse,
)

router = APIRouter(prefix="/references", tags=["references"])


# ============================================
# 레퍼런스 목록 조회
# ============================================
@router.get("", response_model=ReferenceListResponse)
async def list_references(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    review_status: str | None = Query(None, description="검토 상태 필터 (pending/approved/rejected)"),
    grade_level: str | None = Query(None, description="학년 필터"),
    collection_reason: str | None = Query(None, description="수집 사유 필터 (low_confidence/high_difficulty)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """레퍼런스 목록 조회 (필터링 지원)"""
    # 관리자 권한 체크
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    query = select(QuestionReference).order_by(QuestionReference.created_at.desc())

    # 필터 적용
    if review_status:
        query = query.where(QuestionReference.review_status == review_status)
    if grade_level:
        query = query.where(QuestionReference.grade_level == grade_level)
    if collection_reason:
        query = query.where(QuestionReference.collection_reason == collection_reason)

    # 전체 개수 조회
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 페이지네이션 적용
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    references = result.scalars().all()

    return ReferenceListResponse(
        data=references,
        total=total,
        skip=skip,
        limit=limit
    )


# ============================================
# 레퍼런스 통계
# ============================================
@router.get("/stats", response_model=ReferenceStats)
async def get_reference_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """레퍼런스 통계 조회"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 전체 수
    total_result = await db.execute(select(func.count(QuestionReference.id)))
    total = total_result.scalar() or 0

    # 상태별 수
    status_query = select(
        QuestionReference.review_status,
        func.count(QuestionReference.id)
    ).group_by(QuestionReference.review_status)
    status_result = await db.execute(status_query)
    status_counts = {row[0]: row[1] for row in status_result.all()}

    # 학년별 수
    grade_query = select(
        QuestionReference.grade_level,
        func.count(QuestionReference.id)
    ).group_by(QuestionReference.grade_level)
    grade_result = await db.execute(grade_query)
    by_grade = {row[0]: row[1] for row in grade_result.all()}

    # 수집 사유별 수
    reason_query = select(
        QuestionReference.collection_reason,
        func.count(QuestionReference.id)
    ).group_by(QuestionReference.collection_reason)
    reason_result = await db.execute(reason_query)
    by_reason = {row[0]: row[1] for row in reason_result.all()}

    # 평균 신뢰도
    avg_query = select(func.avg(QuestionReference.confidence))
    avg_result = await db.execute(avg_query)
    avg_confidence = avg_result.scalar()

    # 최근 7일 수집 수
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_query = select(func.count(QuestionReference.id)).where(
        QuestionReference.created_at >= week_ago
    )
    recent_result = await db.execute(recent_query)
    recent_count = recent_result.scalar() or 0

    return ReferenceStats(
        total=total,
        pending=status_counts.get("pending", 0),
        approved=status_counts.get("approved", 0),
        rejected=status_counts.get("rejected", 0),
        by_grade=by_grade,
        by_reason=by_reason,
        avg_confidence=round(avg_confidence, 3) if avg_confidence else None,
        recent_count=recent_count,
    )


# ============================================
# 레퍼런스 상세 조회
# ============================================
@router.get("/{reference_id}", response_model=QuestionReferenceDetail)
async def get_reference(
    reference_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """레퍼런스 상세 조회 (원본 스냅샷 포함)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    query = (
        select(QuestionReference)
        .options(
            selectinload(QuestionReference.source_exam),
        )
        .where(QuestionReference.id == reference_id)
    )
    result = await db.execute(query)
    reference = result.scalar_one_or_none()

    if not reference:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    # 응답에 exam 정보 추가
    response_data = QuestionReferenceDetail.model_validate(reference)
    if reference.source_exam:
        response_data.exam_title = reference.source_exam.title
        response_data.exam_grade = reference.source_exam.grade

    return response_data


# ============================================
# 레퍼런스 승인
# ============================================
@router.patch("/{reference_id}/approve", response_model=QuestionReferenceResponse)
async def approve_reference(
    reference_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    request: ReferenceReviewRequest = Body(default=ReferenceReviewRequest()),
):
    """레퍼런스 승인 (프롬프트에 포함됨)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(QuestionReference).where(QuestionReference.id == reference_id)
    )
    reference = result.scalar_one_or_none()

    if not reference:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    reference.review_status = ReviewStatus.APPROVED.value
    reference.reviewed_by = current_user.id
    reference.reviewed_at = datetime.utcnow()
    reference.review_note = request.note

    await db.commit()
    await db.refresh(reference)

    return reference


# ============================================
# 레퍼런스 거부
# ============================================
@router.patch("/{reference_id}/reject", response_model=QuestionReferenceResponse)
async def reject_reference(
    reference_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
    request: ReferenceReviewRequest = Body(...),
):
    """레퍼런스 거부"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(QuestionReference).where(QuestionReference.id == reference_id)
    )
    reference = result.scalar_one_or_none()

    if not reference:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    reference.review_status = ReviewStatus.REJECTED.value
    reference.reviewed_by = current_user.id
    reference.reviewed_at = datetime.utcnow()
    reference.review_note = request.note

    await db.commit()
    await db.refresh(reference)

    return reference


# ============================================
# 레퍼런스 삭제
# ============================================
@router.delete("/{reference_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reference(
    reference_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """레퍼런스 삭제 (관리자 전용)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(QuestionReference).where(QuestionReference.id == reference_id)
    )
    reference = result.scalar_one_or_none()

    if not reference:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    await db.delete(reference)
    await db.commit()

    return None


# ============================================
# 학년 목록 조회 (필터용)
# ============================================
@router.get("/grades/list", response_model=list[str])
async def list_grades(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: CurrentUser,
):
    """수집된 레퍼런스의 학년 목록 조회"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    query = (
        select(QuestionReference.grade_level)
        .distinct()
        .order_by(QuestionReference.grade_level)
    )
    result = await db.execute(query)
    grades = [row[0] for row in result.all()]

    return grades
