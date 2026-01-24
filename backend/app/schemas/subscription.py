"""Subscription and credits schemas."""
from datetime import datetime
from pydantic import BaseModel
from app.models.user import SubscriptionTier


class UsageStatus(BaseModel):
    """현재 사용량 상태"""
    tier: SubscriptionTier
    subscription_expires_at: datetime | None

    # 월별 사용량
    monthly_analysis_used: int
    monthly_analysis_limit: int  # -1 = 무제한
    monthly_extended_used: int
    monthly_extended_limit: int  # -1 = 무제한

    # 크레딧
    credits: int
    credits_expires_at: datetime | None

    # 계산된 값
    can_analyze: bool
    can_use_extended: bool

    # MASTER 계정 여부
    is_master: bool = False


class PurchaseCreditsRequest(BaseModel):
    """크레딧 구매 요청"""
    package: str  # "3", "10", "30"


class PurchaseCreditsResponse(BaseModel):
    """크레딧 구매 응답 (Mock)"""
    success: bool
    credits_added: int
    total_credits: int
    message: str


class SubscribeRequest(BaseModel):
    """구독 요청"""
    tier: SubscriptionTier


class SubscribeResponse(BaseModel):
    """구독 응답 (Mock)"""
    success: bool
    tier: SubscriptionTier
    expires_at: datetime
    message: str


# 크레딧 패키지 정의
CREDIT_PACKAGES = {
    "3": {"credits": 3, "price": 1500, "unit_price": 500},
    "10": {"credits": 10, "price": 3900, "unit_price": 390},
    "30": {"credits": 30, "price": 9900, "unit_price": 330},
}

# 구독 가격 정의
SUBSCRIPTION_PRICES = {
    SubscriptionTier.BASIC: {"price": 3900, "name": "베이직"},
    SubscriptionTier.PRO: {"price": 7900, "name": "프로"},
}
