"""Subscription API endpoints."""
from fastapi import APIRouter

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
from app.services.subscription import get_subscription_service, SubscriptionTier, TIER_LIMITS

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
            "weekly_analysis": limits["weekly_analysis"],
            "weekly_extended": limits["weekly_extended"],
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


def _get_tier_features(tier: SubscriptionTier) -> list[str]:
    """티어별 기능 목록"""
    if tier == SubscriptionTier.FREE:
        return [
            "주 3회 기본 분석",
            "출제현황 분석",
            "확장 분석 미리보기",
            "전체 이력 보관",
        ]
    elif tier == SubscriptionTier.BASIC:
        return [
            "주 10회 기본 분석",
            "출제현황 분석",
            "주 2회 확장 분석",
            "기본형 학습 계획",
        ]
    else:  # PRO
        return [
            "무제한 기본 분석",
            "출제현황 분석",
            "무제한 확장 분석",
            "맞춤형 학습 계획",
        ]
