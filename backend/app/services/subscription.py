"""Subscription and usage service using Supabase REST API."""
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional, Any
from fastapi import HTTPException, status

from app.db.supabase_client import SupabaseClient
from app.schemas.subscription import (
    UsageStatus,
    PurchaseCreditsRequest,
    PurchaseCreditsResponse,
    SubscribeRequest,
    SubscribeResponse,
    CREDIT_PACKAGES,
    SUBSCRIPTION_PRICES,
)
from app.services.credit_log import get_credit_log_service


class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"


# 티어별 주간 한도 설정 (매주 월요일 오전 9시 KST 초기화)
TIER_LIMITS = {
    SubscriptionTier.FREE: {
        "weekly_analysis": 3,    # 주 3회
        "weekly_extended": 0,    # 미리보기만
    },
    SubscriptionTier.BASIC: {
        "weekly_analysis": 10,   # 주 10회
        "weekly_extended": 3,    # 주 3회
    },
    SubscriptionTier.PRO: {
        "weekly_analysis": -1,   # 무제한
        "weekly_extended": -1,   # 무제한
    },
}

# MASTER (is_superuser=True) 한도 - 무제한
MASTER_LIMITS = {
    "weekly_analysis": -1,
    "weekly_extended": -1,
}


class UserDict(dict):
    """User data wrapper that allows attribute access."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'UserDict' has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


class SubscriptionService:
    """구독 및 사용량 관리 서비스"""

    def __init__(self, db: SupabaseClient):
        self.db = db

    async def get_user(self, user_id: str) -> UserDict:
        """사용자 조회"""
        result = await self.db.table("users").select("*").eq("id", user_id).maybe_single().execute()
        if result.error or result.data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        return UserDict(result.data)

    async def _update_user(self, user_id: str, update_data: dict) -> None:
        """사용자 정보 업데이트"""
        update_data["updated_at"] = datetime.utcnow().isoformat()
        result = await self.db.table("users").eq("id", user_id).update(update_data).execute()
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"사용자 업데이트 실패: {result.error}"
            )

    def _get_next_monday_9am_kst(self, from_time: datetime | None = None) -> datetime:
        """다음 월요일 오전 9시 KST (UTC 기준 월요일 00:00) 계산"""
        now = from_time or datetime.now(timezone.utc)
        # KST = UTC + 9, 월요일 오전 9시 KST = 월요일 00:00 UTC
        # weekday(): Monday=0, Sunday=6
        days_until_monday = (7 - now.weekday()) % 7
        if days_until_monday == 0:  # 이미 월요일이면 다음 주 월요일
            days_until_monday = 7
        next_monday = now + timedelta(days=days_until_monday)
        return next_monday.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=timezone.utc)

    def _get_last_monday_9am_kst(self) -> datetime:
        """가장 최근 월요일 오전 9시 KST (UTC 기준 월요일 00:00) 계산"""
        now = datetime.utcnow()
        # weekday(): Monday=0, Sunday=6
        days_since_monday = now.weekday()
        last_monday = now - timedelta(days=days_since_monday)
        return last_monday.replace(hour=0, minute=0, second=0, microsecond=0)

    async def check_and_reset_weekly_usage(self, user: UserDict) -> bool:
        """주간 사용량 리셋 체크 (매주 월요일 오전 9시 KST). 리셋했으면 True 반환."""
        now = datetime.utcnow()
        reset_date_str = user.get("usage_reset_at")

        if reset_date_str:
            if isinstance(reset_date_str, str):
                reset_date = datetime.fromisoformat(reset_date_str.replace("Z", "+00:00").replace("+00:00", ""))
            else:
                reset_date = reset_date_str
        else:
            reset_date = self._get_last_monday_9am_kst()

        # 마지막 월요일 00:00 UTC (= 월요일 09:00 KST) 이후로 리셋이 안됐으면 리셋
        last_monday = self._get_last_monday_9am_kst()
        if reset_date < last_monday:
            await self._update_user(user["id"], {
                "monthly_analysis_count": 0,  # DB 컬럼명 (주간 용도로 사용)
                "monthly_extended_count": 0,
                "usage_reset_at": last_monday.isoformat(),
            })
            # 로컬 객체도 업데이트
            user["monthly_analysis_count"] = 0
            user["monthly_extended_count"] = 0
            return True
        return False

    async def get_usage_status(self, user_id: str) -> UsageStatus:
        """현재 사용량 상태 조회"""
        user = await self.get_user(user_id)
        await self.check_and_reset_weekly_usage(user)

        # MASTER 계정 (is_superuser) 체크
        is_master = user.get("is_superuser", False)

        tier = SubscriptionTier(user.get("subscription_tier", "free"))

        # MASTER는 무제한, 일반 유저는 티어별 한도
        limits = MASTER_LIMITS if is_master else TIER_LIMITS[tier]

        # 구독 만료 체크 (MASTER가 아닌 경우만)
        now = datetime.utcnow()
        subscription_expires_str = user.get("subscription_expires_at")
        subscription_expires_at = None

        if subscription_expires_str:
            if isinstance(subscription_expires_str, str):
                subscription_expires_at = datetime.fromisoformat(subscription_expires_str.replace("Z", "+00:00").replace("+00:00", ""))
            else:
                subscription_expires_at = subscription_expires_str

        if not is_master and subscription_expires_at and subscription_expires_at < now:
            # 구독 만료 → 무료로 다운그레이드
            await self._update_user(user["id"], {
                "subscription_tier": SubscriptionTier.FREE.value,
                "subscription_expires_at": None,
            })
            tier = SubscriptionTier.FREE
            limits = TIER_LIMITS[tier]
            subscription_expires_at = None

        # 크레딧 만료 체크
        credits_expires_str = user.get("credits_expires_at")
        credits_expires_at = None

        if credits_expires_str:
            if isinstance(credits_expires_str, str):
                credits_expires_at = datetime.fromisoformat(credits_expires_str.replace("Z", "+00:00").replace("+00:00", ""))
            else:
                credits_expires_at = credits_expires_str

        credits = user.get("credits", 0)
        if credits_expires_at and credits_expires_at < now:
            await self._update_user(user["id"], {
                "credits": 0,
                "credits_expires_at": None,
            })
            credits = 0
            credits_expires_at = None

        analysis_limit = limits["weekly_analysis"]
        extended_limit = limits["weekly_extended"]
        weekly_analysis_count = user.get("monthly_analysis_count", 0)  # DB 컬럼명
        weekly_extended_count = user.get("monthly_extended_count", 0)  # DB 컬럼명

        # 분석 가능 여부: MASTER이거나, 한도 내 OR 크레딧 있음
        can_analyze = (
            is_master or
            analysis_limit == -1 or
            weekly_analysis_count < analysis_limit or
            credits > 0
        )

        # 확장 분석 가능 여부
        can_use_extended = (
            is_master or
            extended_limit == -1 or
            weekly_extended_count < extended_limit or
            credits >= 2  # 확장 분석은 2크레딧
        )

        # 다음 초기화 시간 계산
        next_reset_at = self._get_next_monday_9am_kst()

        return UsageStatus(
            tier=tier,
            subscription_expires_at=subscription_expires_at,
            weekly_analysis_used=weekly_analysis_count,
            weekly_analysis_limit=analysis_limit,
            weekly_extended_used=weekly_extended_count,
            weekly_extended_limit=extended_limit,
            next_reset_at=next_reset_at,
            credits=credits,
            credits_expires_at=credits_expires_at,
            can_analyze=can_analyze,
            can_use_extended=can_use_extended,
            is_master=is_master,
        )

    async def consume_analysis(self, user_id: str, exam_type: str = "blank", exam_id: str | None = None) -> dict:
        """분석 1회 소비

        Args:
            user_id: 사용자 ID
            exam_type: 시험지 유형 (blank: 1크레딧, student: 2크레딧)
            exam_id: 시험지 ID (로그용)

        Returns:
            dict: {
                "success": bool,
                "credits_consumed": int (소비된 크레딧, 0이면 무료 한도 내),
                "credits_remaining": int (남은 크레딧)
            }
        """
        # exam_type에 따른 크레딧 비용 결정
        credit_cost = 2 if exam_type == "student" else 1

        user = await self.get_user(user_id)
        await self.check_and_reset_weekly_usage(user)

        weekly_analysis_count = user.get("monthly_analysis_count", 0)  # DB 컬럼명
        credits = user.get("credits", 0)

        # 로그 서비스 초기화
        credit_log_service = get_credit_log_service(self.db)

        # MASTER는 무제한
        if user.get("is_superuser", False):
            await self._update_user(user["id"], {
                "monthly_analysis_count": weekly_analysis_count + 1,
            })
            # 무료 사용 기록
            description = "학생용 시험지 분석" if exam_type == "student" else "시험지 분석"
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="analysis",
                reference_id=exam_id,
                description=description,
            )
            return {"success": True, "credits_consumed": 0, "credits_remaining": credits}

        tier = SubscriptionTier(user.get("subscription_tier", "free"))
        limits = TIER_LIMITS[tier]
        analysis_limit = limits["weekly_analysis"]

        # 무제한이면 카운트만 증가
        if analysis_limit == -1:
            await self._update_user(user["id"], {
                "monthly_analysis_count": weekly_analysis_count + 1,
            })
            # 무료 사용 기록
            description = "학생용 시험지 분석" if exam_type == "student" else "시험지 분석"
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="analysis",
                reference_id=exam_id,
                description=description,
            )
            return {"success": True, "credits_consumed": 0, "credits_remaining": credits}

        # 한도 내면 카운트 증가 (무료)
        if weekly_analysis_count < analysis_limit:
            await self._update_user(user["id"], {
                "monthly_analysis_count": weekly_analysis_count + 1,
            })
            # 무료 사용 기록
            description = "학생용 시험지 분석" if exam_type == "student" else "시험지 분석"
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="analysis",
                reference_id=exam_id,
                description=description,
            )
            return {"success": True, "credits_consumed": 0, "credits_remaining": credits}

        # 크레딧 차감 (exam_type에 따라 차등)
        if credits >= credit_cost:
            new_credits = credits - credit_cost
            await self._update_user(user["id"], {
                "credits": new_credits,
                "monthly_analysis_count": weekly_analysis_count + 1,
            })
            # 크레딧 차감 기록
            description = "학생용 시험지 분석" if exam_type == "student" else "시험지 분석"
            await credit_log_service.log(
                user_id=user_id,
                change_amount=-credit_cost,
                balance_before=credits,
                balance_after=new_credits,
                action_type="analysis",
                reference_id=exam_id,
                description=description,
            )
            return {"success": True, "credits_consumed": credit_cost, "credits_remaining": new_credits}

        return {"success": False, "credits_consumed": 0, "credits_remaining": credits}

    async def consume_extended(self, user_id: str, exam_id: str | None = None) -> bool:
        """확장 분석 1회 소비 (성공 시 True)

        Args:
            user_id: 사용자 ID
            exam_id: 시험지 ID (로그용)
        """
        user = await self.get_user(user_id)
        await self.check_and_reset_weekly_usage(user)

        weekly_extended_count = user.get("monthly_extended_count", 0)  # DB 컬럼명
        credits = user.get("credits", 0)
        credit_log_service = get_credit_log_service(self.db)

        # MASTER는 무제한
        if user.get("is_superuser", False):
            await self._update_user(user["id"], {
                "monthly_extended_count": weekly_extended_count + 1,
            })
            # 무료 사용 기록
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="extended",
                reference_id=exam_id,
                description="확장 분석",
            )
            return True

        tier = SubscriptionTier(user.get("subscription_tier", "free"))
        limits = TIER_LIMITS[tier]
        extended_limit = limits["weekly_extended"]

        # 무제한이면 카운트만 증가
        if extended_limit == -1:
            await self._update_user(user["id"], {
                "monthly_extended_count": weekly_extended_count + 1,
            })
            # 무료 사용 기록
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="extended",
                reference_id=exam_id,
                description="확장 분석",
            )
            return True

        # 한도 내면 카운트 증가 (무료)
        if weekly_extended_count < extended_limit:
            await self._update_user(user["id"], {
                "monthly_extended_count": weekly_extended_count + 1,
            })
            # 무료 사용 기록
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="extended",
                reference_id=exam_id,
                description="확장 분석",
            )
            return True

        # 크레딧 차감 (2크레딧)
        if credits >= 2:
            new_credits = credits - 2
            await self._update_user(user["id"], {
                "credits": new_credits,
                "monthly_extended_count": weekly_extended_count + 1,
            })
            # 크레딧 차감 기록
            await credit_log_service.log(
                user_id=user_id,
                change_amount=-2,
                balance_before=credits,
                balance_after=new_credits,
                action_type="extended",
                reference_id=exam_id,
                description="확장 분석",
            )
            return True

        return False

    async def purchase_credits(
        self, user_id: str, request: PurchaseCreditsRequest
    ) -> PurchaseCreditsResponse:
        """크레딧 구매 (Mock)"""
        if request.package not in CREDIT_PACKAGES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="유효하지 않은 패키지입니다"
            )

        package = CREDIT_PACKAGES[request.package]
        user = await self.get_user(user_id)

        current_credits = user.get("credits", 0)
        new_credits = current_credits + package["credits"]

        # Mock: 실제로는 결제 처리 필요
        await self._update_user(user["id"], {
            "credits": new_credits,
            "credits_expires_at": (datetime.utcnow() + timedelta(days=180)).isoformat(),  # 6개월
        })

        # 크레딧 로그 기록
        credit_log_service = get_credit_log_service(self.db)
        await credit_log_service.log(
            user_id=user_id,
            change_amount=package["credits"],
            balance_before=current_credits,
            balance_after=new_credits,
            action_type="purchase",
            reference_id=request.package,
            description=f"크레딧 구매 ({package['credits']}개)",
        )

        return PurchaseCreditsResponse(
            success=True,
            credits_added=package["credits"],
            total_credits=new_credits,
            message=f"{package['credits']}크레딧이 추가되었습니다.",
        )

    async def subscribe(
        self, user_id: str, request: SubscribeRequest
    ) -> SubscribeResponse:
        """구독 (Mock)"""
        if request.tier == SubscriptionTier.FREE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="무료 요금제는 구독할 수 없습니다"
            )

        user = await self.get_user(user_id)

        # 이미 동일 요금제인 경우 차단
        if user.get("subscription_tier") == request.tier.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 해당 요금제를 사용 중입니다."
            )

        # Mock: 실제로는 결제 처리 필요
        expires_at = datetime.utcnow() + timedelta(days=30)
        await self._update_user(user["id"], {
            "subscription_tier": request.tier.value,
            "subscription_expires_at": expires_at.isoformat(),
            # 구독 시작 시 주간 사용량 리셋
            "monthly_analysis_count": 0,
            "monthly_extended_count": 0,
            "usage_reset_at": datetime.utcnow().isoformat(),
        })

        return SubscribeResponse(
            success=True,
            tier=request.tier,
            expires_at=expires_at,
            message=f"{SUBSCRIPTION_PRICES[request.tier]['name']} 구독이 시작되었습니다.",
        )

    async def consume_export(self, user_id: str, exam_id: str | None = None) -> bool:
        """내보내기 1회 소비 (성공 시 True) - 1크레딧 차감

        Args:
            user_id: 사용자 ID
            exam_id: 시험지 ID (로그용)
        """
        user = await self.get_user(user_id)

        credits = user.get("credits", 0)

        # MASTER는 무제한
        if user.get("is_superuser", False):
            # MASTER 내보내기도 로그 기록
            credit_log_service = get_credit_log_service(self.db)
            await credit_log_service.log(
                user_id=user_id,
                change_amount=0,
                balance_before=credits,
                balance_after=credits,
                action_type="export",
                reference_id=exam_id,
                description="결과 내보내기",
            )
            return True

        # 크레딧 사용 (1크레딧)
        if credits >= 1:
            new_credits = credits - 1
            await self._update_user(user["id"], {
                "credits": new_credits,
            })
            # 크레딧 로그 기록
            credit_log_service = get_credit_log_service(self.db)
            await credit_log_service.log(
                user_id=user_id,
                change_amount=-1,
                balance_before=credits,
                balance_after=new_credits,
                action_type="export",
                reference_id=exam_id,
                description="결과 내보내기",
            )
            return True

        return False

    async def cancel_subscription(self, user_id: str) -> dict:
        """구독 취소 (만료일까지는 유지)"""
        user = await self.get_user(user_id)

        if user.get("subscription_tier") == SubscriptionTier.FREE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="활성화된 구독이 없습니다"
            )

        subscription_expires_str = user.get("subscription_expires_at")
        subscription_expires_at = None
        if subscription_expires_str:
            if isinstance(subscription_expires_str, str):
                subscription_expires_at = datetime.fromisoformat(subscription_expires_str.replace("Z", "+00:00").replace("+00:00", ""))
            else:
                subscription_expires_at = subscription_expires_str

        # 실제로는 다음 결제 취소 처리
        # 현재 구독은 만료일까지 유지
        return {
            "message": "구독이 취소되었습니다. 현재 구독은 만료일까지 유지됩니다.",
            "expires_at": subscription_expires_at,
        }


def get_subscription_service(db: SupabaseClient) -> SubscriptionService:
    return SubscriptionService(db)
