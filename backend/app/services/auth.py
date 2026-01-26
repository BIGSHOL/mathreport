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


async def get_or_create_user_from_supabase(
    db: SupabaseClient,
    auth_user_id: str,
    email: str,
    user_metadata: dict
) -> Optional[UserDict]:
    """
    Supabase Auth 사용자 정보를 기반으로 public.users 테이블의 사용자를 조회하거나 생성합니다.

    Supabase Auth의 auth.users 테이블과 우리의 public.users 테이블을 동기화합니다.
    - auth_user_id: Supabase auth.users의 UUID (JWT의 sub 클레임)
    - email: 사용자 이메일
    - user_metadata: Supabase user_metadata (nickname, provider 등)
    """
    # 먼저 기존 사용자 조회 (auth_user_id로)
    user = await get_user_by_id(db, auth_user_id)

    if user:
        return user

    # ID로 못 찾으면 이메일로 조회 (기존 사용자)
    user = await get_user_by_email(db, email)
    if user:
        return user  # 기존 사용자 반환

    # 사용자가 없으면 새로 생성
    # user_metadata에서 정보 추출
    nickname = user_metadata.get("nickname") or user_metadata.get("name") or user_metadata.get("full_name") or email.split("@")[0]

    # 새 사용자 데이터 구성
    user_data = {
        "id": auth_user_id,  # Supabase auth.users의 UUID를 그대로 사용
        "email": email,
        "hashed_password": "",  # Supabase Auth 사용자는 비밀번호 불필요
        "nickname": nickname,
        "is_active": True,
        "is_superuser": False,
        "data_consent": False,
        "subscription_tier": "free",
        "credits": 5,  # 신규 가입 환영 크레딧
        "monthly_analysis_count": 0,
        "monthly_extended_count": 0,
        "usage_reset_at": datetime.utcnow().isoformat(),
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }

    result = await db.table("users").insert(user_data).execute()

    if result.error:
        # 이미 생성된 경우 (동시성 처리)
        return await get_user_by_id(db, auth_user_id)

    # 신규 가입 크레딧 지급 로그 기록
    try:
        from app.services.credit_log import get_credit_log_service
        credit_log_service = get_credit_log_service(db)
        await credit_log_service.log(
            user_id=auth_user_id,
            change_amount=5,
            balance_before=0,
            balance_after=5,
            action_type="reward",
            description="신규 가입 환영 크레딧",
        )
    except Exception as e:
        print(f"[CreditLog] 신규 가입 로그 기록 실패 (무시됨): {e}")

    return UserDict(result.data)
