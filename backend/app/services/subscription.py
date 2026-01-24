"""Subscription and usage service."""
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User, SubscriptionTier, TIER_LIMITS, MASTER_LIMITS
from app.schemas.subscription import (
    UsageStatus,
    PurchaseCreditsRequest,
    PurchaseCreditsResponse,
    SubscribeRequest,
    SubscribeResponse,
    CREDIT_PACKAGES,
    SUBSCRIPTION_PRICES,
)


class SubscriptionService:
    """구독 및 사용량 관리 서비스"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user(self, user_id: str) -> User:
        """사용자 조회"""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

    async def check_and_reset_monthly_usage(self, user: User) -> None:
        """월별 사용량 리셋 체크 (매월 1일)"""
        now = datetime.utcnow()
        reset_date = user.usage_reset_at

        # 다음 달이 되었으면 리셋
        if now.year > reset_date.year or (now.year == reset_date.year and now.month > reset_date.month):
            user.monthly_analysis_count = 0
            user.monthly_extended_count = 0
            user.usage_reset_at = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            await self.db.commit()

    async def get_usage_status(self, user_id: str) -> UsageStatus:
        """현재 사용량 상태 조회"""
        user = await self.get_user(user_id)
        await self.check_and_reset_monthly_usage(user)

        # MASTER 계정 (is_superuser) 체크
        is_master = user.is_superuser

        tier = SubscriptionTier(user.subscription_tier)

        # MASTER는 무제한, 일반 유저는 티어별 한도
        limits = MASTER_LIMITS if is_master else TIER_LIMITS[tier]

        # 구독 만료 체크 (MASTER가 아닌 경우만)
        now = datetime.utcnow()
        if not is_master and user.subscription_expires_at and user.subscription_expires_at < now:
            # 구독 만료 → 무료로 다운그레이드
            user.subscription_tier = SubscriptionTier.FREE.value
            user.subscription_expires_at = None
            await self.db.commit()
            tier = SubscriptionTier.FREE
            limits = TIER_LIMITS[tier]

        # 크레딧 만료 체크
        if user.credits_expires_at and user.credits_expires_at < now:
            user.credits = 0
            user.credits_expires_at = None
            await self.db.commit()

        analysis_limit = limits["monthly_analysis"]
        extended_limit = limits["monthly_extended"]

        # 분석 가능 여부: MASTER이거나, 한도 내 OR 크레딧 있음
        can_analyze = (
            is_master or
            analysis_limit == -1 or
            user.monthly_analysis_count < analysis_limit or
            user.credits > 0
        )

        # 확장 분석 가능 여부
        can_use_extended = (
            is_master or
            extended_limit == -1 or
            user.monthly_extended_count < extended_limit or
            user.credits >= 2  # 확장 분석은 2크레딧
        )

        return UsageStatus(
            tier=tier,
            subscription_expires_at=user.subscription_expires_at,
            monthly_analysis_used=user.monthly_analysis_count,
            monthly_analysis_limit=analysis_limit,
            monthly_extended_used=user.monthly_extended_count,
            monthly_extended_limit=extended_limit,
            credits=user.credits,
            credits_expires_at=user.credits_expires_at,
            can_analyze=can_analyze,
            can_use_extended=can_use_extended,
            is_master=is_master,
        )

    async def consume_analysis(self, user_id: str, exam_type: str = "blank") -> bool:
        """분석 1회 소비 (성공 시 True)

        Args:
            user_id: 사용자 ID
            exam_type: 시험지 유형 (blank: 1크레딧, student: 2크레딧)
        """
        # exam_type에 따른 크레딧 비용 결정
        credit_cost = 2 if exam_type == "student" else 1

        user = await self.get_user(user_id)
        await self.check_and_reset_monthly_usage(user)

        # MASTER는 무제한
        if user.is_superuser:
            user.monthly_analysis_count += 1
            await self.db.commit()
            return True

        tier = SubscriptionTier(user.subscription_tier)
        limits = TIER_LIMITS[tier]
        analysis_limit = limits["monthly_analysis"]

        # 무제한이면 카운트만 증가
        if analysis_limit == -1:
            user.monthly_analysis_count += 1
            await self.db.commit()
            return True

        # 한도 내면 카운트 증가
        if user.monthly_analysis_count < analysis_limit:
            user.monthly_analysis_count += 1
            await self.db.commit()
            return True

        # 크레딧 사용 (exam_type에 따라 차등)
        if user.credits >= credit_cost:
            user.credits -= credit_cost
            user.monthly_analysis_count += 1
            await self.db.commit()
            return True

        return False

    async def consume_extended(self, user_id: str) -> bool:
        """확장 분석 1회 소비 (성공 시 True)"""
        user = await self.get_user(user_id)
        await self.check_and_reset_monthly_usage(user)

        # MASTER는 무제한
        if user.is_superuser:
            user.monthly_extended_count += 1
            await self.db.commit()
            return True

        tier = SubscriptionTier(user.subscription_tier)
        limits = TIER_LIMITS[tier]
        extended_limit = limits["monthly_extended"]

        # 무제한이면 카운트만 증가
        if extended_limit == -1:
            user.monthly_extended_count += 1
            await self.db.commit()
            return True

        # 한도 내면 카운트 증가
        if user.monthly_extended_count < extended_limit:
            user.monthly_extended_count += 1
            await self.db.commit()
            return True

        # 크레딧 사용 (2크레딧)
        if user.credits >= 2:
            user.credits -= 2
            user.monthly_extended_count += 1
            await self.db.commit()
            return True

        return False

    async def purchase_credits(
        self, user_id: str, request: PurchaseCreditsRequest
    ) -> PurchaseCreditsResponse:
        """크레딧 구매 (Mock)"""
        if request.package not in CREDIT_PACKAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid package"
            )

        package = CREDIT_PACKAGES[request.package]
        user = await self.get_user(user_id)

        # Mock: 실제로는 결제 처리 필요
        user.credits += package["credits"]
        user.credits_expires_at = datetime.utcnow() + timedelta(days=180)  # 6개월
        await self.db.commit()

        return PurchaseCreditsResponse(
            success=True,
            credits_added=package["credits"],
            total_credits=user.credits,
            message=f"{package['credits']}크레딧이 추가되었습니다.",
        )

    async def subscribe(
        self, user_id: str, request: SubscribeRequest
    ) -> SubscribeResponse:
        """구독 (Mock)"""
        if request.tier == SubscriptionTier.FREE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot subscribe to free tier"
            )

        user = await self.get_user(user_id)

        # 이미 동일 요금제인 경우 차단
        if user.subscription_tier == request.tier.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 해당 요금제를 사용 중입니다."
            )

        # Mock: 실제로는 결제 처리 필요
        user.subscription_tier = request.tier.value
        user.subscription_expires_at = datetime.utcnow() + timedelta(days=30)
        # 구독 시작 시 월별 사용량 리셋
        user.monthly_analysis_count = 0
        user.monthly_extended_count = 0
        user.usage_reset_at = datetime.utcnow()
        await self.db.commit()

        return SubscribeResponse(
            success=True,
            tier=request.tier,
            expires_at=user.subscription_expires_at,
            message=f"{SUBSCRIPTION_PRICES[request.tier]['name']} 구독이 시작되었습니다.",
        )

    async def cancel_subscription(self, user_id: str) -> dict:
        """구독 취소 (만료일까지는 유지)"""
        user = await self.get_user(user_id)

        if user.subscription_tier == SubscriptionTier.FREE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active subscription"
            )

        # 실제로는 다음 결제 취소 처리
        # 현재 구독은 만료일까지 유지
        return {
            "message": "구독이 취소되었습니다. 현재 구독은 만료일까지 유지됩니다.",
            "expires_at": user.subscription_expires_at,
        }


def get_subscription_service(db: AsyncSession) -> SubscriptionService:
    return SubscriptionService(db)
