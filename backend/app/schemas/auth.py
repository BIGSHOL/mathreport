"""
Authentication Schemas
FEAT-0: 인증/인가

계약 파일 참조: contracts/auth.contract.ts
"""

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

# ----- Request Schemas -----

class RegisterRequest(BaseModel):
    """POST /api/v1/auth/register"""
    email: EmailStr = Field(..., description="로그인 이메일")
    password: str = Field(
        ...,
        min_length=8,
        max_length=100,
        description="비밀번호 (최소 8자, 영문+숫자 조합)"
    )
    nickname: str = Field(
        ...,
        min_length=2,
        max_length=50,
        description="표시 이름"
    )

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        """비밀번호 강도 검증: 영문+숫자 포함"""
        if not re.search(r'[a-zA-Z]', v):
            raise ValueError('비밀번호는 영문을 포함해야 합니다')
        if not re.search(r'\d', v):
            raise ValueError('비밀번호는 숫자를 포함해야 합니다')
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "teacher@example.com",
                "password": "securepass123",
                "nickname": "김선생님"
            }
        }
    }


class LoginRequest(BaseModel):
    """POST /api/v1/auth/login"""
    email: EmailStr = Field(..., description="로그인 이메일")
    password: str = Field(..., description="비밀번호")

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "teacher@example.com",
                "password": "securepass123"
            }
        }
    }


class RefreshTokenRequest(BaseModel):
    """POST /api/v1/auth/refresh"""
    refresh_token: str = Field(..., description="Refresh Token")

    model_config = {
        "json_schema_extra": {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }
    }


# ----- Response Schemas -----

class UserBase(BaseModel):
    """사용자 기본 정보"""
    id: str = Field(..., description="UUID")
    email: EmailStr = Field(..., description="이메일")
    nickname: str = Field(..., description="표시 이름")
    role: Literal['user', 'admin'] = Field(default='user', description="역할")


class RegisterResponse(UserBase):
    """POST /api/v1/auth/register 응답"""
    created_at: datetime = Field(..., description="가입일")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "teacher@example.com",
                "nickname": "김선생님",
                "role": "user",
                "created_at": "2024-01-23T10:00:00Z"
            }
        }
    }


class LoginResponse(BaseModel):
    """POST /api/v1/auth/login 응답"""
    access_token: str = Field(..., description="JWT Access Token (15분)")
    refresh_token: str = Field(..., description="Refresh Token (7일)")
    token_type: Literal['bearer'] = Field(default='bearer', description="토큰 타입")
    expires_in: int = Field(..., description="Access Token 만료 시간 (초)")
    user: UserBase = Field(..., description="사용자 정보")

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900,
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "teacher@example.com",
                    "nickname": "김선생님",
                    "role": "user"
                }
            }
        }
    }


class TokenResponse(BaseModel):
    """POST /api/v1/auth/refresh 응답"""
    access_token: str = Field(..., description="새로운 Access Token")
    token_type: Literal['bearer'] = Field(default='bearer', description="토큰 타입")
    expires_in: int = Field(..., description="만료 시간 (초)")

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900
            }
        }
    }


class UserResponse(UserBase):
    """GET /api/v1/users/me 응답"""
    created_at: datetime = Field(..., description="가입일")
    updated_at: datetime | None = Field(default=None, description="최종 수정일")
    data_consent: bool = Field(default=False, description="AI 데이터 활용 동의")
    subscription_tier: str = Field(default="free", description="구독 티어")
    credits: int = Field(default=5, description="보유 크레딧")
    preferred_template: str = Field(default="detailed", description="선호 템플릿")

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "teacher@example.com",
                "nickname": "김선생님",
                "role": "user",
                "created_at": "2024-01-23T10:00:00Z",
                "updated_at": "2024-01-23T10:00:00Z",
                "data_consent": False,
                "subscription_tier": "free",
                "credits": 0,
                "preferred_template": "detailed"
            }
        }
    }


# ----- Internal Schemas (JWT 토큰 페이로드 등) -----

class TokenPayload(BaseModel):
    """JWT 토큰 페이로드"""
    sub: str | None = None  # subject (user_id)
    exp: int | None = None  # expiration time


# ----- Error Response -----

class ErrorDetail(BaseModel):
    """에러 상세 정보"""
    field: str | None = Field(None, description="에러 발생 필드")
    reason: str = Field(..., description="에러 원인")


class ErrorResponse(BaseModel):
    """에러 응답"""
    error: dict = Field(
        ...,
        description="에러 정보",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "이메일 또는 비밀번호가 올바르지 않습니다.",
                    "details": [
                        {
                            "field": "password",
                            "reason": "비밀번호가 일치하지 않습니다"
                        }
                    ]
                }
            }
        }
    }
