"""Authentication service using Supabase REST API."""
from enum import Enum
from typing import Optional, Any
from datetime import datetime

from app.core.security import get_password_hash, verify_password
from app.db.supabase_client import SupabaseClient
from app.schemas.auth import RegisterRequest


class AuthError(str, Enum):
    """인증 실패 원인"""
    USER_NOT_FOUND = "user_not_found"
    WRONG_PASSWORD = "wrong_password"
    ACCOUNT_DISABLED = "account_disabled"


class UserDict(dict):
    """User data wrapper that allows attribute access."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'UserDict' has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


async def get_user_by_email(db: SupabaseClient, email: str) -> Optional[UserDict]:
    """Get user by email."""
    result = await db.table("users").select("*").eq("email", email).maybe_single().execute()

    if result.error or result.data is None:
        return None

    return UserDict(result.data)


async def get_user_by_id(db: SupabaseClient, user_id: str) -> Optional[UserDict]:
    """Get user by ID."""
    result = await db.table("users").select("*").eq("id", user_id).maybe_single().execute()

    if result.error or result.data is None:
        return None

    return UserDict(result.data)


async def authenticate_user(db: SupabaseClient, email: str, password: str) -> tuple[Optional[UserDict], Optional[AuthError]]:
    """Authenticate user with email and password.

    Returns:
        (user, None) if successful
        (None, AuthError) if failed
    """
    user = await get_user_by_email(db, email)
    if not user:
        return None, AuthError.USER_NOT_FOUND
    if not user.get("is_active", True):
        return None, AuthError.ACCOUNT_DISABLED
    if not verify_password(password, user.get("hashed_password", "")):
        return None, AuthError.WRONG_PASSWORD
    return user, None


async def create_user(db: SupabaseClient, user_in: RegisterRequest) -> UserDict:
    """Create new user."""
    import uuid

    user_data = {
        "id": str(uuid.uuid4()),
        "email": user_in.email,
        "hashed_password": get_password_hash(user_in.password),
        "nickname": user_in.nickname,
        "is_active": True,
        "is_superuser": False,
        "data_consent": False,
        "subscription_tier": "free",
        "credits": 0,
        "monthly_analysis_count": 0,
        "monthly_extended_count": 0,
        "usage_reset_at": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("users").insert(user_data).execute()

    if result.error:
        raise Exception(f"Failed to create user: {result.error}")

    return UserDict(result.data)


async def update_password(db: SupabaseClient, user: UserDict, new_password: str) -> UserDict:
    """Update user password."""
    update_data = {
        "hashed_password": get_password_hash(new_password),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("users").eq("id", user["id"]).update(update_data).execute()

    if result.error:
        raise Exception(f"Failed to update password: {result.error}")

    # 업데이트된 사용자 반환
    return await get_user_by_id(db, user["id"])


async def update_user(db: SupabaseClient, user_id: str, update_data: dict) -> Optional[UserDict]:
    """Update user data."""
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = await db.table("users").eq("id", user_id).update(update_data).execute()

    if result.error:
        raise Exception(f"Failed to update user: {result.error}")

    return await get_user_by_id(db, user_id)
