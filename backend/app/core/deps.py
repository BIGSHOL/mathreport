"""Dependencies for authentication."""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import ALGORITHM
from app.db.supabase_client import SupabaseClient, get_supabase
from app.services.auth import UserDict, get_user_by_id
from app.schemas.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def get_db() -> SupabaseClient:
    """Get database client (Supabase REST API)."""
    return get_supabase()


# Type alias for dependency injection
DbDep = Annotated[SupabaseClient, Depends(get_db)]


async def get_current_user(
    db: DbDep,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> UserDict:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenPayload(sub=user_id)
    except JWTError:
        raise credentials_exception from None

    user = await get_user_by_id(db, token_data.sub)

    if user is None:
        raise credentials_exception
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )

    return user


CurrentUser = Annotated[UserDict, Depends(get_current_user)]
