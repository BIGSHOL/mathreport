"""User endpoints."""
from fastapi import APIRouter

from app.core.deps import CurrentUser, DbDep
from app.schemas.auth import UserResponse
from app.schemas.user import UserUpdate
from app.services.auth import update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser):
    """Get current user's profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        nickname=current_user.nickname,
        role="admin" if current_user.is_superuser else "user",
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        data_consent=current_user.data_consent,
        subscription_tier=current_user.subscription_tier,
        credits=current_user.credits,
    )


@router.patch("/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: CurrentUser,
    db: DbDep,
):
    """Update current user's profile."""
    # None이 아닌 필드만 업데이트
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}

    if not update_dict:
        # 업데이트할 내용이 없으면 현재 사용자 반환
        return UserResponse(
            id=str(current_user.id),
            email=current_user.email,
            nickname=current_user.nickname,
            role="admin" if current_user.is_superuser else "user",
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
            data_consent=current_user.data_consent,
            subscription_tier=current_user.subscription_tier,
            credits=current_user.credits,
        )

    updated_user = await update_user(db, current_user.id, update_dict)

    return UserResponse(
        id=str(updated_user.id),
        email=updated_user.email,
        nickname=updated_user.nickname,
        role="admin" if updated_user.is_superuser else "user",
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at,
        data_consent=updated_user.data_consent,
        subscription_tier=updated_user.subscription_tier,
        credits=updated_user.credits,
    )
