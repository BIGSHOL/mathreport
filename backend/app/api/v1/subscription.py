"""Subscription API endpoints."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.deps import CurrentUser, DbDep
from app.schemas.subscription import (
    UsageStatus,
    PurchaseCreditsRequest,
    PurchaseCreditsResponse,
    SubscribeRequest,
    SubscribeResponse,
    CREDIT_PACKAGES,
    SUBSCRIPTION_PRICES,
)
from app.services.subscription import get_subscription_service
from app.models.user import SubscriptionTier, TIER_LIMITS
from app.services.credit_log import get_credit_log_service


# ============================================
# Schemas for Credit History
# ============================================

class CreditLogItem(BaseModel):
    """크레딧 내역 아이템"""
    id: str
    change_amount: int
    balance_before: int
    balance_after: int
    action_type: str
    reference_id: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime


class CreditLogsResponse(BaseModel):
    """크레딧 내역 응답"""
    logs: list[CreditLogItem]
    total: int
    has_more: bool

router = APIRouter(tags=["subscription"])


@router.get("/usage", response_model=UsageStatus, summary="사용량 조회")
async def get_usage(
    current_user: CurrentUser,
    db: DbDep,
) -> UsageStatus:
    """현재 사용량 및 구독 상태를 조회합니다."""
    service = get_subscription_service(db)
    return await service.get_usage_status(current_user["id"])


@router.get("/plans", summary="요금제 목록 조회")
async def get_plans():
    """이용 가능한 요금제 목록을 조회합니다."""
    plans = []

    for tier in SubscriptionTier:
        limits = TIER_LIMITS[tier]
        plan = {
            "tier": tier.value,
            "name": "무료" if tier == SubscriptionTier.FREE else SUBSCRIPTION_PRICES.get(tier, {}).get("name", tier.value),
            "price": 0 if tier == SubscriptionTier.FREE else SUBSCRIPTION_PRICES.get(tier, {}).get("price", 0),
            "original_price": SUBSCRIPTION_PRICES.get(tier, {}).get("original_price"),
            "monthly_analysis": limits["monthly_analysis"],
            "monthly_extended": limits["monthly_extended"],
            "weekly_credits": limits.get("weekly_credits", 0),
            "features": _get_tier_features(tier),
        }
        plans.append(plan)

    return {"plans": plans}


@router.get("/credit-packages", summary="크레딧 패키지 목록 조회")
async def get_credit_packages():
    """이용 가능한 크레딧 패키지 목록을 조회합니다."""
    packages = []
    for key, value in CREDIT_PACKAGES.items():
        packages.append({
            "id": key,
            "credits": value["credits"],
            "price": value["price"],
            "unit_price": value["unit_price"],
            "original_price": value.get("original_price"),
        })
    return {"packages": packages}


@router.post("/subscribe", response_model=SubscribeResponse, summary="구독 시작")
async def subscribe(
    request: SubscribeRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> SubscribeResponse:
    """구독을 시작합니다. (Mock - 실제 결제 없음)"""
    service = get_subscription_service(db)
    return await service.subscribe(current_user["id"], request)


@router.post("/cancel", summary="구독 취소")
async def cancel_subscription(
    current_user: CurrentUser,
    db: DbDep,
):
    """구독을 취소합니다. 현재 구독 기간은 만료일까지 유지됩니다."""
    service = get_subscription_service(db)
    return await service.cancel_subscription(current_user["id"])


@router.post("/credits/purchase", response_model=PurchaseCreditsResponse, summary="크레딧 구매")
async def purchase_credits(
    request: PurchaseCreditsRequest,
    current_user: CurrentUser,
    db: DbDep,
) -> PurchaseCreditsResponse:
    """크레딧을 구매합니다. (Mock - 실제 결제 없음)"""
    service = get_subscription_service(db)
    return await service.purchase_credits(current_user["id"], request)


@router.get("/credits/history", response_model=CreditLogsResponse, summary="크레딧 내역 조회")
async def get_credit_history(
    current_user: CurrentUser,
    db: DbDep,
    limit: int = 20,
    offset: int = 0,
) -> CreditLogsResponse:
    """크레딧 변동 내역을 조회합니다."""
    service = get_credit_log_service(db)
    logs, total = await service.get_history(
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
    )
    return CreditLogsResponse(
        logs=[CreditLogItem(**log) for log in logs],
        total=total,
        has_more=(offset + limit) < total,
    )


def _get_tier_features(tier: SubscriptionTier) -> list[str]:
    """티어별 기능 목록 (점진적 구조: Free → Basic → Pro)"""
    if tier == SubscriptionTier.FREE:
        return [
            "시험지 출제현황 분석",
            "AI 시험 총평",
            "문항별 난이도·유형 분석",
            "전체 이력 보관",
        ]
    elif tier == SubscriptionTier.BASIC:
        return [
            "Free 전체 기능 포함",
            "학생 답안 정오답 분석",
            "영역별 학습 전략",
            "점수대별 학습 계획",
        ]
    else:  # PRO
        return [
            "Basic 전체 기능 포함",
            "4단계 확장 분석 리포트",
            "시험 대비 D-day 전략",
            "맞춤형 성과 예측",
        ]
