"""
Question Reference Management API
문제 레퍼런스 자동 수집 및 관리자 검토 엔드포인트
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, status, Query, Body

from app.core.deps import CurrentUser, DbDep
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
    db: DbDep,
    current_user: CurrentUser,
    review_status: str | None = Query(None, description="검토 상태 필터 (pending/approved/rejected)"),
    grade_level: str | None = Query(None, description="학년 필터"),
    collection_reason: str | None = Query(None, description="수집 사유 필터 (low_confidence/high_difficulty)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
):
    """레퍼런스 목록 조회 (필터링 지원)"""
    # 관리자 권한 체크
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 기본 쿼리
    query = db.table("question_references").select("*").order("created_at", desc=True)

    # 필터 적용
    if review_status:
        query = query.eq("review_status", review_status)
    if grade_level:
        query = query.eq("grade_level", grade_level)
    if collection_reason:
        query = query.eq("collection_reason", collection_reason)

    # 전체 개수 조회 (필터 적용된 상태)
    count_query = db.table("question_references").select("id", count="exact")
    if review_status:
        count_query = count_query.eq("review_status", review_status)
    if grade_level:
        count_query = count_query.eq("grade_level", grade_level)
    if collection_reason:
        count_query = count_query.eq("collection_reason", collection_reason)

    count_result = await count_query.execute()
    total = count_result.count if count_result.count is not None else len(count_result.data or [])

    # 페이지네이션 적용
    query = query.range(skip, skip + limit - 1)
    result = await query.execute()
    references = result.data or []

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
    db: DbDep,
    current_user: CurrentUser,
):
    """레퍼런스 통계 조회"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 전체 데이터 조회
    result = await db.table("question_references").select("*").execute()
    all_refs = result.data or []

    total = len(all_refs)

    # 상태별 수
    status_counts = {}
    for ref in all_refs:
        status = ref.get("review_status", "pending")
        status_counts[status] = status_counts.get(status, 0) + 1

    # 학년별 수
    by_grade = {}
    for ref in all_refs:
        grade = ref.get("grade_level")
        if grade:
            by_grade[grade] = by_grade.get(grade, 0) + 1

    # 수집 사유별 수
    by_reason = {}
    for ref in all_refs:
        reason = ref.get("collection_reason")
        if reason:
            by_reason[reason] = by_reason.get(reason, 0) + 1

    # 평균 신뢰도
    confidences = [ref.get("confidence") for ref in all_refs if ref.get("confidence") is not None]
    avg_confidence = sum(confidences) / len(confidences) if confidences else None

    # 최근 7일 수집 수
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_count = sum(
        1 for ref in all_refs
        if ref.get("created_at") and datetime.fromisoformat(ref["created_at"].replace("Z", "+00:00").replace("+00:00", "")) >= week_ago
    )

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
# 학년 목록 조회 (필터용) - /grades/list는 /{reference_id} 보다 먼저 정의해야 함
# ============================================
@router.get("/grades/list", response_model=list[str])
async def list_grades(
    db: DbDep,
    current_user: CurrentUser,
):
    """수집된 레퍼런스의 학년 목록 조회"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.table("question_references").select("grade_level").execute()
    refs = result.data or []

    # 중복 제거 및 정렬
    grades = sorted(set(ref.get("grade_level") for ref in refs if ref.get("grade_level")))

    return grades


# ============================================
# 레퍼런스 상세 조회
# ============================================
@router.get("/{reference_id}", response_model=QuestionReferenceDetail)
async def get_reference(
    reference_id: str,
    db: DbDep,
    current_user: CurrentUser,
):
    """레퍼런스 상세 조회 (원본 스냅샷 포함)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.table("question_references").select("*").eq("id", reference_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    reference = result.data

    # exam 정보 조회
    if reference.get("source_exam_id"):
        exam_result = await db.table("exams").select("title, grade").eq("id", reference["source_exam_id"]).maybe_single().execute()
        if exam_result.data:
            reference["exam_title"] = exam_result.data.get("title")
            reference["exam_grade"] = exam_result.data.get("grade")

    return reference


# ============================================
# 레퍼런스 승인
# ============================================
@router.patch("/{reference_id}/approve", response_model=QuestionReferenceResponse)
async def approve_reference(
    reference_id: str,
    db: DbDep,
    current_user: CurrentUser,
    request: ReferenceReviewRequest = Body(default=ReferenceReviewRequest()),
):
    """레퍼런스 승인 (프롬프트에 포함됨)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 존재 확인
    check_result = await db.table("question_references").select("id").eq("id", reference_id).maybe_single().execute()
    if check_result.error or check_result.data is None:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    # 업데이트
    update_data = {
        "review_status": "approved",
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.utcnow().isoformat(),
        "review_note": request.note,
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("question_references").eq("id", reference_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"업데이트 실패: {result.error}")

    return result.data


# ============================================
# 레퍼런스 거부
# ============================================
@router.patch("/{reference_id}/reject", response_model=QuestionReferenceResponse)
async def reject_reference(
    reference_id: str,
    db: DbDep,
    current_user: CurrentUser,
    request: ReferenceReviewRequest = Body(...),
):
    """레퍼런스 거부"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 존재 확인
    check_result = await db.table("question_references").select("id").eq("id", reference_id).maybe_single().execute()
    if check_result.error or check_result.data is None:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    # 업데이트
    update_data = {
        "review_status": "rejected",
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.utcnow().isoformat(),
        "review_note": request.note,
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("question_references").eq("id", reference_id).update(update_data).execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"업데이트 실패: {result.error}")

    return result.data


# ============================================
# 레퍼런스 삭제
# ============================================
@router.delete("/{reference_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reference(
    reference_id: str,
    db: DbDep,
    current_user: CurrentUser,
):
    """레퍼런스 삭제 (관리자 전용)"""
    if not current_user.get("is_superuser"):
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # 존재 확인
    check_result = await db.table("question_references").select("id").eq("id", reference_id).maybe_single().execute()
    if check_result.error or check_result.data is None:
        raise HTTPException(status_code=404, detail="레퍼런스를 찾을 수 없습니다")

    # 삭제
    result = await db.table("question_references").eq("id", reference_id).delete().execute()

    if result.error:
        raise HTTPException(status_code=500, detail=f"삭제 실패: {result.error}")

    return None
