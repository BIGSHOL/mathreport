"""User model for authentication."""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, String, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SubscriptionTier(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"


# 티어별 한도 설정
TIER_LIMITS = {
    SubscriptionTier.FREE: {
        "monthly_analysis": 5,
        "monthly_extended": 0,  # 미리보기만
        "weekly_credits": 10,
    },
    SubscriptionTier.BASIC: {
        "monthly_analysis": 20,
        "monthly_extended": 5,
        "weekly_credits": 30,
    },
    SubscriptionTier.PRO: {
        "monthly_analysis": -1,  # 무제한
        "monthly_extended": -1,  # 무제한
        "weekly_credits": 100,
    },
}

# MASTER (is_superuser=True) 한도 - 무제한
MASTER_LIMITS = {
    "monthly_analysis": -1,
    "monthly_extended": -1,
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    nickname: Mapped[str] = mapped_column(String(50), nullable=False)
    profile_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    data_consent: Mapped[bool] = mapped_column(Boolean, default=False)  # AI 개선 데이터 활용 동의

    # 구독 관련
    subscription_tier: Mapped[str] = mapped_column(
        String(20), default=SubscriptionTier.FREE.value, nullable=False
    )
    subscription_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 크레딧 관련
    credits: Mapped[int] = mapped_column(Integer, default=5, nullable=False)  # 회원가입 시 5크레딧 지급
    credits_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 월별 사용량 (매월 1일 리셋)
    monthly_analysis_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    monthly_extended_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    usage_reset_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
