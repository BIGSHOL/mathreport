"""Dependencies for authentication."""
import httpx
import logging
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, jwk
from jose.exceptions import JWTError, JWKError

from app.core.config import settings
from app.db.supabase_client import SupabaseClient, get_supabase
from app.services.auth import UserDict, get_or_create_user_from_supabase
from app.services.security_logger import get_security_logger

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

# JWKS 캐시 (앱 시작 시 한 번만 로드)
_jwks_cache: dict | None = None


def get_db() -> SupabaseClient:
    """Get database client (Supabase REST API)."""
    return get_supabase()


# Type alias for dependency injection
DbDep = Annotated[SupabaseClient, Depends(get_db)]


async def get_supabase_jwks() -> dict:
    """Supabase JWKS(JSON Web Key Set) 가져오기."""
    global _jwks_cache

    if _jwks_cache is not None:
        return _jwks_cache

    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL이 설정되지 않았습니다"
        )

    jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"

    async with httpx.AsyncClient() as client:
        response = await client.get(jwks_url)
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase JWKS를 가져올 수 없습니다"
            )
        _jwks_cache = response.json()
        return _jwks_cache


def get_signing_key(jwks: dict, token: str) -> str:
    """JWT의 kid에 맞는 서명 키 찾기."""
    try:
        # JWT 헤더에서 kid 추출
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        alg = unverified_header.get("alg")

        logger.debug(f"[AUTH] Token alg: {alg}, kid: {kid}")

        # JWKS에서 매칭되는 키 찾기
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                return key

        raise JWKError(f"No matching key found for kid: {kid}")
    except Exception as e:
        logger.warning(f"[AUTH] Error getting signing key: {e}")
        raise


async def get_current_user(
    request: Request,
    db: DbDep,
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> UserDict:
    """Get current authenticated user from Supabase JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )

    security_logger = get_security_logger(db)
    email: Optional[str] = None

    if not token:
        logger.debug("[AUTH] No token provided")
        raise credentials_exception

    try:
        # JWT 헤더 확인
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg")
        logger.debug(f"[AUTH] Token algorithm: {alg}")

        if alg == "ES256":
            # ES256: JWKS 사용하여 검증
            jwks = await get_supabase_jwks()
            signing_key = get_signing_key(jwks, token)

            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["ES256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            logger.debug("[AUTH] ES256 JWT verified successfully")

        else:
            # HS256: 기존 방식 (JWT Secret 사용)
            jwt_secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
            logger.debug(f"[AUTH] Using HS256 with secret (length: {len(jwt_secret)})")

            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True}
            )
            logger.debug("[AUTH] HS256 JWT verified successfully")

        # Supabase JWT에서 사용자 정보 추출
        user_id: str = payload.get("sub")
        email = payload.get("email")
        user_metadata: dict = payload.get("user_metadata", {})

        logger.debug(f"[AUTH] User ID: {user_id}, Email: {email}")

        if user_id is None:
            logger.warning("[AUTH] No user_id in token")
            await security_logger.log_auth_failure(
                request=request,
                error_message="No user_id in token",
                email=email,
            )
            raise credentials_exception

    except JWTError as e:
        logger.warning(f"[AUTH] JWT verification failed: {e}")
        await security_logger.log_auth_failure(
            request=request,
            error_message=f"JWT verification failed: {e}",
            email=email,
        )
        raise credentials_exception from None
    except JWKError as e:
        logger.warning(f"[AUTH] JWK error: {e}")
        await security_logger.log_auth_failure(
            request=request,
            error_message=f"JWK error: {e}",
            email=email,
        )
        raise credentials_exception from None

    # public.users 테이블에서 사용자 조회 또는 생성
    user = await get_or_create_user_from_supabase(
        db,
        auth_user_id=user_id,
        email=email,
        user_metadata=user_metadata
    )

    if user is None:
        logger.warning("[AUTH] User not found and could not be created")
        await security_logger.log_auth_failure(
            request=request,
            error_message="User not found and could not be created",
            email=email,
        )
        raise credentials_exception

    if not user.get("is_active", True):
        await security_logger.log_auth_failure(
            request=request,
            error_message="Inactive account access attempt",
            email=email,
            details={"user_id": user.get("id")},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )

    logger.info(f"[AUTH] User authenticated: {user.get('email')}")
    return user


CurrentUser = Annotated[UserDict, Depends(get_current_user)]


async def get_admin_user(
    current_user: CurrentUser,
) -> UserDict:
    """관리자 권한 확인."""
    if not current_user.get("is_superuser", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="관리자 권한이 필요합니다"
        )
    return current_user


AdminUser = Annotated[UserDict, Depends(get_admin_user)]
