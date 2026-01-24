"""User endpoints."""
from fastapi import APIRouter

from app.core.deps import CurrentUser
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser):
    """Get current user's profile."""
    # ORM 모델을 응답 스키마로 변환
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
