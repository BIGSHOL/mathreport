"""User schemas."""
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    nickname: str
    profile_image: str | None = None


class UserCreate(UserBase):
    password: str
    data_consent: bool = False  # AI 개선 데이터 활용 동의


class UserUpdate(BaseModel):
    nickname: str | None = None
    profile_image: str | None = None
    data_consent: bool | None = None  # AI 개선 데이터 활용 동의


class UserResponse(UserBase):
    id: str
    is_active: bool
    data_consent: bool  # AI 개선 데이터 활용 동의
    subscription_tier: str = "free"  # 구독 티어
    credits: int = 0  # 보유 크레딧
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserInDB(UserResponse):
    hashed_password: str
