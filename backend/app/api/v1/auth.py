"""
Authentication endpoints.
FEAT-0: 인증/인가
"""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import (
    ALGORITHM,
    create_access_token,
    create_refresh_token,
)
from app.core.deps import DbDep
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserBase,
)
from app.services.auth import authenticate_user, create_user, get_user_by_email, AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: RegisterRequest,
    db: DbDep,
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
        id=user["id"],
        email=user["email"],
        nickname=user["nickname"],
        role="user",  # 기본 역할
        created_at=user["created_at"]
    )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: DbDep,
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
    user, auth_error = await authenticate_user(db, login_data.email, login_data.password)
    if auth_error:
        error_messages = {
            AuthError.USER_NOT_FOUND: {
                "code": "USER_NOT_FOUND",
                "message": "등록되지 않은 이메일입니다.",
                "details": [{"field": "email", "reason": "해당 이메일로 가입된 계정이 없습니다. 회원가입을 진행해주세요."}]
            },
            AuthError.WRONG_PASSWORD: {
                "code": "WRONG_PASSWORD",
                "message": "비밀번호가 올바르지 않습니다.",
                "details": [{"field": "password", "reason": "비밀번호를 다시 확인해주세요."}]
            },
            AuthError.ACCOUNT_DISABLED: {
                "code": "ACCOUNT_DISABLED",
                "message": "비활성화된 계정입니다.",
                "details": [{"field": "email", "reason": "관리자에게 문의해주세요."}]
            },
        }
        error_info = error_messages.get(auth_error, {
            "code": "INVALID_CREDENTIALS",
            "message": "인증에 실패했습니다.",
            "details": []
        })
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": error_info}
        )

    # Access Token 생성 (15분)
    access_token_expires = timedelta(minutes=15)
    access_token = create_access_token(
        subject=user["id"],
        expires_delta=access_token_expires
    )

    # Refresh Token 생성 (7일)
    refresh_token = create_refresh_token(subject=user["id"])

    # 응답 반환
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=900,  # 15분 = 900초
        user=UserBase(
            id=user["id"],
            email=user["email"],
            nickname=user["nickname"],
            role="user"
        )
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: DbDep,
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
