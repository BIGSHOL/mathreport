"""Subscription and credits schemas."""
from datetime import datetime
from pydantic import BaseModel
from app.models.user import SubscriptionTier


class UsageStatus(BaseModel):
    """현재 사용량 상태"""
    tier: SubscriptionTier
    subscription_expires_at: datetime | None

    # 주간 사용량 (매주 월요일 오전 9시 KST 초기화)
    weekly_analysis_used: int
    weekly_analysis_limit: int  # -1 = 무제한
    weekly_extended_used: int
    weekly_extended_limit: int  # -1 = 무제한
    next_reset_at: datetime  # 다음 초기화 시간

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


# 크레딧 패키지 정의 (기본 단가: 500원/회)
# 1, 3, 5회: 할인 없음 | 10회: 10% 할인 | 30회: 20% 할인
CREDIT_PACKAGES = {
    "1": {"credits": 1, "price": 500, "unit_price": 500},
    "3": {"credits": 3, "price": 1500, "unit_price": 500},
    "5": {"credits": 5, "price": 2500, "unit_price": 500},
    "10": {"credits": 10, "price": 4500, "unit_price": 450},  # 10% 할인
    "30": {"credits": 30, "price": 12000, "unit_price": 400},  # 20% 할인
}

# 구독 가격 정의
SUBSCRIPTION_PRICES = {
    SubscriptionTier.BASIC: {"price": 9900, "name": "베이직"},
    SubscriptionTier.PRO: {"price": 19900, "name": "프로"},
}
