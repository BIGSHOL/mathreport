"""
Authentication endpoints.
FEAT-0: 인증/인가
"""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    create_refresh_token,
)
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserBase,
)
from app.services.auth import authenticate_user, create_user, get_user_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    회원가입 엔드포인트

    [T1.1] 회원가입 API 구현
    - 이메일 중복 검사
    - 비밀번호 bcrypt 해싱
    - 사용자 정보 반환 (비밀번호 제외)
    """
    # 이메일 중복 검사
    existing_user = await get_user_by_email(db, user_in.email)
    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": {
                    "code": "EMAIL_ALREADY_EXISTS",
                    "message": "이미 사용 중인 이메일입니다.",
                    "details": [
                        {
                            "field": "email",
                            "reason": f"{user_in.email}은(는) 이미 등록된 이메일입니다"
                        }
                    ]
                }
            }
        )

    # 사용자 생성 (비밀번호는 자동으로 해싱됨)
    user = await create_user(db, user_in)

    # RegisterResponse 스키마에 맞춰 반환
    return RegisterResponse(
        id=user.id,
        email=user.email,
        nickname=user.nickname,
        role="user",  # 기본 역할
        created_at=user.created_at
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    로그인 엔드포인트

    [T1.2] 로그인 API 구현
    - 이메일/비밀번호 검증
    - JWT Access Token 발급 (15분)
    - JWT Refresh Token 발급 (7일)
    - 사용자 정보 반환
    """
    # 사용자 인증
    user = await authenticate_user(db, login_data.email, login_data.password)
    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "이메일 또는 비밀번호가 올바르지 않습니다.",
                    "details": [
                        {
                            "field": "credentials",
                            "reason": "이메일 또는 비밀번호가 일치하지 않습니다"
                        }
                    ]
                }
            }
        )

    # Access Token 생성 (15분)
    access_token_expires = timedelta(minutes=15)
    access_token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires
    )

    # Refresh Token 생성 (7일)
    refresh_token = create_refresh_token(subject=user.id)

    # 응답 반환
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900,  # 15분 = 900초
        user=UserBase(
            id=user.id,
            email=user.email,
            nickname=user.nickname,
            role="user"
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Refresh Token으로 새로운 Access Token 발급

    [T1.2] Refresh Token API 구현
    - Refresh Token 검증
    - 새로운 Access Token 발급
    """
    try:
        # Refresh Token 검증
        payload = jwt.decode(
            refresh_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise JWTError()

        # 새로운 Access Token 생성
        access_token_expires = timedelta(minutes=15)
        access_token = create_access_token(
            subject=user_id,
            expires_delta=access_token_expires
        )

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=900  # 15분 = 900초
        )

    except JWTError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "유효하지 않은 토큰입니다.",
                    "details": [
                        {
                            "field": "refresh_token",
                            "reason": "토큰이 만료되었거나 유효하지 않습니다"
                        }
                    ]
                }
            }
        )
