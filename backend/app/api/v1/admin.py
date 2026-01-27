"""Admin endpoints for user management and school trends."""
import asyncio
import logging
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.deps import AdminUser, DbDep
from app.services.credit_log import get_credit_log_service
from app.services.school_trends import get_school_trends_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"])

# 집계 중복 실행 방지 락
_aggregation_lock = asyncio.Lock()


# ============================================
# Credit History Schemas for Admin
# ============================================

class AdminCreditLogItem(BaseModel):
    """관리자용 크레딧 내역 아이템"""
    id: str
    change_amount: int
    balance_before: int
    balance_after: int
    action_type: str
    reference_id: str | None = None
    description: str | None = None
    admin_id: str | None = None
    created_at: datetime


class AdminCreditLogsResponse(BaseModel):
    """관리자용 크레딧 내역 응답"""
    logs: list[AdminCreditLogItem]
    total: int
    has_more: bool


class ResetAnalysisResponse(BaseModel):
    """분석 데이터 초기화 응답"""
    user_id: str
    deleted_exams: int
    deleted_analysis_results: int
    deleted_analysis_extensions: int
    deleted_feedbacks: int
    message: str


class AdminExamItem(BaseModel):
    """관리자용 시험지 아이템"""
    id: str
    title: str
    grade: str | None = None
    subject: str = "수학"
    school_name: str | None = None
    exam_type: str = "blank"
    status: str = "pending"
    created_at: datetime
    error_message: str | None = None
    total_questions: int | None = None
    total_points: float | None = None


class AdminExamsResponse(BaseModel):
    """관리자용 시험지 목록 응답"""
    exams: list[AdminExamItem]
    total: int
    has_more: bool


# ============================================
# Schemas
# ============================================

class UserListItem(BaseModel):
    """사용자 목록 아이템"""
    id: str
    email: str
    nickname: str
    is_active: bool
    is_superuser: bool
    subscription_tier: str
    credits: int
    monthly_analysis_count: int = 0
    monthly_extended_count: int = 0
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    """사용자 목록 응답"""
    data: list[UserListItem]
    total: int


class CreditUpdateRequest(BaseModel):
    """크레딧 수정 요청"""
    amount: int  # 양수면 추가, 음수면 차감
    reason: str = ""  # 사유


class CreditUpdateResponse(BaseModel):
    """크레딧 수정 응답"""
    user_id: str
    previous_credits: int
    new_credits: int
    change: int
    reason: str


class SubscriptionUpdateRequest(BaseModel):
    """요금제 수정 요청"""
    tier: Literal["free", "basic", "pro"]


class SubscriptionUpdateResponse(BaseModel):
    """요금제 수정 응답"""
    user_id: str
    previous_tier: str
    new_tier: str


# ============================================
# Endpoints
# ============================================

@router.get("/users", response_model=UserListResponse)
async def list_users(
    admin: AdminUser,
    db: DbDep,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
):
    """전체 사용자 목록 조회 (관리자 전용)."""
    offset = (page - 1) * page_size

    # 기본 쿼리
    query = db.table("users").select(
        "id, email, nickname, is_active, is_superuser, "
        "subscription_tier, credits, "
        "monthly_analysis_count, monthly_extended_count, "
        "created_at, updated_at"
    )

    # 검색 조건
    if search:
        query = query.or_(f"email.ilike.%{search}%,nickname.ilike.%{search}%")

    # 페이징 및 정렬
    result = await query.order("created_at", desc=True).limit(page_size).offset(offset).execute()

    users = [UserListItem(**user) for user in result.data]

    # 전체 개수 조회 (간단히 전체 조회 후 카운트)
    count_query = db.table("users").select("id")
    if search:
        count_query = count_query.or_(f"email.ilike.%{search}%,nickname.ilike.%{search}%")
    count_result = await count_query.execute()
    total = len(count_result.data) if count_result.data else len(users)

    return UserListResponse(
        data=users,
        total=total
    )


@router.get("/users/{user_id}", response_model=UserListItem)
async def get_user(
    user_id: str,
    admin: AdminUser,
    db: DbDep,
):
    """특정 사용자 조회 (관리자 전용)."""
    result = await db.table("users").select(
        "id, email, nickname, is_active, is_superuser, "
        "subscription_tier, credits, "
        "monthly_analysis_count, monthly_extended_count, "
        "created_at, updated_at"
    ).eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    return UserListItem(**result.data)


@router.patch("/users/{user_id}/credits", response_model=CreditUpdateResponse)
async def update_user_credits(
    user_id: str,
    request: CreditUpdateRequest,
    admin: AdminUser,
    db: DbDep,
):
    """사용자 크레딧 수정 (관리자 전용)."""
    # 현재 사용자 조회
    result = await db.table("users").select("id, credits").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    previous_credits = result.data["credits"]
    new_credits = max(0, previous_credits + request.amount)  # 음수 방지

    # 크레딧 업데이트
    update_result = await db.table("users").eq("id", user_id).update({
        "credits": new_credits,
        "updated_at": datetime.utcnow().isoformat()
    }).execute()

    if update_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"크레딧 업데이트 실패: {update_result.error}"
        )

    # 크레딧 변경 로그 기록
    credit_log_service = get_credit_log_service(db)
    await credit_log_service.log(
        user_id=user_id,
        change_amount=request.amount,
        balance_before=previous_credits,
        balance_after=new_credits,
        action_type="admin",
        description=request.reason or "관리자 크레딧 조정",
        admin_id=admin["id"],
    )

    return CreditUpdateResponse(
        user_id=user_id,
        previous_credits=previous_credits,
        new_credits=new_credits,
        change=request.amount,
        reason=request.reason
    )


@router.patch("/users/{user_id}/subscription", response_model=SubscriptionUpdateResponse)
async def update_user_subscription(
    user_id: str,
    request: SubscriptionUpdateRequest,
    admin: AdminUser,
    db: DbDep,
):
    """사용자 요금제 수정 (관리자 전용)."""
    # 현재 사용자 조회
    result = await db.table("users").select("id, subscription_tier").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    previous_tier = result.data["subscription_tier"]

    # 요금제 업데이트
    update_result = await db.table("users").eq("id", user_id).update({
        "subscription_tier": request.tier,
        "updated_at": datetime.utcnow().isoformat()
    }).execute()

    if update_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"요금제 업데이트 실패: {update_result.error}"
        )

    return SubscriptionUpdateResponse(
        user_id=user_id,
        previous_tier=previous_tier,
        new_tier=request.tier
    )


@router.patch("/users/{user_id}/toggle-active", response_model=UserListItem)
async def toggle_user_active(
    user_id: str,
    admin: AdminUser,
    db: DbDep,
):
    """사용자 활성/비활성 토글 (관리자 전용)."""
    # 현재 사용자 조회
    result = await db.table("users").select("*").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # 관리자 자신은 비활성화할 수 없음
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자신의 계정은 비활성화할 수 없습니다"
        )

    new_is_active = not result.data["is_active"]

    # 상태 업데이트
    update_result = await db.table("users").eq("id", user_id).update({
        "is_active": new_is_active,
        "updated_at": datetime.utcnow().isoformat()
    }).execute()

    if update_result.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"상태 업데이트 실패: {update_result.error}"
        )

    # 업데이트된 사용자 정보 반환
    updated = await db.table("users").select(
        "id, email, nickname, is_active, is_superuser, "
        "subscription_tier, credits, "
        "monthly_analysis_count, monthly_extended_count, "
        "created_at, updated_at"
    ).eq("id", user_id).maybe_single().execute()

    return UserListItem(**updated.data)


@router.get("/users/{user_id}/credit-history", response_model=AdminCreditLogsResponse)
async def get_user_credit_history(
    user_id: str,
    admin: AdminUser,
    db: DbDep,
    limit: int = 20,
    offset: int = 0,
):
    """사용자 크레딧 내역 조회 (관리자 전용)."""
    # 사용자 존재 확인
    result = await db.table("users").select("id").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # 크레딧 내역 조회
    service = get_credit_log_service(db)
    logs, total = await service.get_history(user_id, limit, offset)

    return AdminCreditLogsResponse(
        logs=[AdminCreditLogItem(**log) for log in logs],
        total=total,
        has_more=(offset + limit) < total,
    )


@router.get("/users/{user_id}/exams", response_model=AdminExamsResponse)
async def get_user_exams(
    user_id: str,
    admin: AdminUser,
    db: DbDep,
    limit: int = 20,
    offset: int = 0,
):
    """사용자 시험지 목록 조회 (관리자 전용)."""
    # 사용자 존재 확인
    result = await db.table("users").select("id").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    # 시험지 목록 조회
    exams_result = await (
        db.table("exams")
        .select("id, title, grade, subject, school_name, exam_type, status, created_at, error_message")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    # 전체 개수 조회
    count_result = await (
        db.table("exams")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total = count_result.count if count_result.count is not None else 0

    exams = []
    for exam_data in (exams_result.data or []):
        item = AdminExamItem(**exam_data)
        if exam_data.get("status") == "completed":
            ar = await (
                db.table("analysis_results")
                .select("total_questions, total_points")
                .eq("exam_id", exam_data["id"])
                .maybe_single()
                .execute()
            )
            if ar.data:
                item.total_questions = ar.data.get("total_questions")
                item.total_points = ar.data.get("total_points")
        exams.append(item)

    return AdminExamsResponse(
        exams=exams,
        total=total,
        has_more=(offset + limit) < total,
    )


@router.delete("/users/{user_id}/analysis", response_model=ResetAnalysisResponse)
async def reset_user_analysis(
    user_id: str,
    admin: AdminUser,
    db: DbDep,
):
    """사용자 분석 데이터 초기화 (관리자 전용).

    삭제되는 데이터:
    - 시험지 (exams)
    - 분석 결과 (analysis_results)
    - 확장 분석 (analysis_extensions)
    - 피드백 (feedbacks)
    - 패턴 매칭 기록 (pattern_match_history)
    - 질문 참조 (question_references)

    유지되는 데이터:
    - 계정 정보
    - 크레딧 및 크레딧 내역
    - 구독 정보
    """
    # 사용자 존재 확인
    result = await db.table("users").select("id, nickname").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="사용자를 찾을 수 없습니다"
        )

    user_nickname = result.data.get("nickname", "Unknown")

    # 삭제 통계
    deleted_counts = {
        "exams": 0,
        "analysis_results": 0,
        "analysis_extensions": 0,
        "feedbacks": 0,
    }

    try:
        # 1. 피드백 삭제
        feedbacks_result = await db.table("feedbacks").select("id").eq("user_id", user_id).execute()
        if feedbacks_result.data:
            deleted_counts["feedbacks"] = len(feedbacks_result.data)
            await db.table("feedbacks").eq("user_id", user_id).delete().execute()

        # 2. 분석 결과 ID 목록 조회 (확장 분석 삭제용)
        analysis_result = await db.table("analysis_results").select("id").eq("user_id", user_id).execute()
        analysis_ids = [r["id"] for r in analysis_result.data] if analysis_result.data else []

        # 3. 확장 분석 삭제
        if analysis_ids:
            extensions_result = await db.table("analysis_extensions").select("id").eq("user_id", user_id).execute()
            if extensions_result.data:
                deleted_counts["analysis_extensions"] = len(extensions_result.data)
                await db.table("analysis_extensions").eq("user_id", user_id).delete().execute()

        # 4. 패턴 매칭 기록 삭제 (analysis_id 기반)
        for analysis_id in analysis_ids:
            await db.table("pattern_match_history").eq("analysis_id", analysis_id).delete().execute()

        # 5. 질문 참조 삭제 (analysis_id 기반)
        for analysis_id in analysis_ids:
            await db.table("question_references").eq("source_analysis_id", analysis_id).delete().execute()

        # 6. 분석 결과 삭제
        if analysis_ids:
            deleted_counts["analysis_results"] = len(analysis_ids)
            await db.table("analysis_results").eq("user_id", user_id).delete().execute()

        # 7. 시험지 삭제
        exams_result = await db.table("exams").select("id").eq("user_id", user_id).execute()
        if exams_result.data:
            deleted_counts["exams"] = len(exams_result.data)
            await db.table("exams").eq("user_id", user_id).delete().execute()

        # 8. 사용량 카운터 초기화
        await db.table("users").eq("id", user_id).update({
            "monthly_analysis_count": 0,
            "monthly_extended_count": 0,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"데이터 초기화 실패: {str(e)}"
        )

    return ResetAnalysisResponse(
        user_id=user_id,
        deleted_exams=deleted_counts["exams"],
        deleted_analysis_results=deleted_counts["analysis_results"],
        deleted_analysis_extensions=deleted_counts["analysis_extensions"],
        deleted_feedbacks=deleted_counts["feedbacks"],
        message=f"{user_nickname}님의 분석 데이터가 초기화되었습니다."
    )


# ============================================
# School Trends Schemas
# ============================================

class SchoolTrendItem(BaseModel):
    """학교별 출제 경향 아이템"""
    id: str
    school_name: str
    school_region: str | None = None
    school_type: str | None = None
    grade: str
    subject: str
    period_type: str
    period_value: str | None = None
    sample_count: int
    difficulty_distribution: dict
    difficulty_avg_points: dict
    question_type_distribution: dict
    chapter_distribution: dict
    avg_total_points: float
    avg_question_count: float
    trend_summary: dict
    created_at: datetime
    updated_at: datetime


class SchoolTrendsResponse(BaseModel):
    """학교별 출제 경향 목록 응답"""
    data: list[SchoolTrendItem]
    total: int


class AggregateResponse(BaseModel):
    """집계 실행 응답"""
    message: str
    created: int
    updated: int
    total_schools_processed: int = 0


class RegionSummaryItem(BaseModel):
    """지역별 요약 아이템"""
    region: str
    school_count: int
    grades: list[str]


# ============================================
# School Trends Endpoints
# ============================================

@router.get("/school-trends", response_model=SchoolTrendsResponse)
async def list_school_trends(
    admin: AdminUser,
    db: DbDep,
    school_name: str | None = None,
    school_region: str | None = None,
    grade: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """학교별 출제 경향 조회 (관리자 전용)."""
    service = get_school_trends_service(db)
    trends, total = await service.get_school_trends(
        school_name=school_name,
        school_region=school_region,
        grade=grade,
        limit=limit,
        offset=offset,
    )

    return SchoolTrendsResponse(
        data=[SchoolTrendItem(**t) for t in trends],
        total=total,
    )


@router.post("/school-trends/aggregate", response_model=AggregateResponse)
async def aggregate_school_trends(
    admin: AdminUser,
    db: DbDep,
    school_name: str | None = None,
    min_sample_count: int = 1,
):
    """학교별 출제 경향 집계 실행 (관리자 전용).

    시험 데이터를 학교/학년/과목별로 집계하여 경향 데이터를 생성합니다.

    Args:
        school_name: 특정 학교만 집계 (선택)
        min_sample_count: 경향 생성에 필요한 최소 시험 수 (기본 1)
    """
    if _aggregation_lock.locked():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 집계가 진행 중입니다. 잠시 후 다시 시도해주세요.",
        )

    async with _aggregation_lock:
        service = get_school_trends_service(db)
        result = await service.aggregate_school_trends(
            school_name=school_name,
            min_sample_count=min_sample_count,
        )

    return AggregateResponse(**result)


@router.get("/school-trends/regions", response_model=list[RegionSummaryItem])
async def get_region_summary(
    admin: AdminUser,
    db: DbDep,
):
    """지역별 학교 경향 요약 조회 (관리자 전용)."""
    service = get_school_trends_service(db)
    summary = await service.get_region_summary()

    return [RegionSummaryItem(**s) for s in summary]


@router.get("/school-trends/available-regions", response_model=list[str])
async def get_available_regions(
    admin: AdminUser,
    db: DbDep,
):
    """사용 가능한 지역 목록 조회 (관리자 전용).

    실제 집계된 데이터에 존재하는 지역만 반환합니다.
    필터 드롭다운에 사용됩니다.
    """
    result = await db.table("school_exam_trends").select("school_region").execute()
    regions_set: set[str] = set()
    for item in (result.data or []):
        region = item.get("school_region")
        if region:
            regions_set.add(region)
    return sorted(regions_set)


@router.delete("/school-trends/{trend_id}")
async def delete_school_trend(
    trend_id: str,
    admin: AdminUser,
    db: DbDep,
):
    """학교별 출제 경향 삭제 (관리자 전용)."""
    result = await db.table("school_exam_trends").select(
        "id, school_name, grade, subject"
    ).eq("id", trend_id).maybe_single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="경향 데이터를 찾을 수 없습니다"
        )

    trend_info = result.data
    await db.table("school_exam_trends").eq("id", trend_id).delete().execute()

    logger.info(
        "School trend deleted | admin=%s | trend_id=%s | school=%s | grade=%s | subject=%s",
        admin["id"], trend_id,
        trend_info.get("school_name"), trend_info.get("grade"), trend_info.get("subject"),
    )

    return {"message": "삭제되었습니다", "id": trend_id}
