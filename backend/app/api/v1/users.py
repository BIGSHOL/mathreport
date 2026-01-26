"""User endpoints."""
from fastapi import APIRouter

from app.core.deps import CurrentUser, DbDep
from app.schemas.auth import UserResponse
from app.schemas.user import UserUpdate
from app.schemas.template import (
    TemplateType, TemplateInfo, TemplateUpdateRequest, get_all_templates
)
from app.services.auth import update_user

router = APIRouter(prefix="/users", tags=["users"])


def _build_user_response(user) -> UserResponse:
    """사용자 응답 객체 생성 헬퍼."""
    return UserResponse(
        id=str(user.id),
        email=user.email,
        nickname=user.nickname,
        role="admin" if user.is_superuser else "user",
        created_at=user.created_at,
        updated_at=user.updated_at,
        data_consent=user.data_consent,
        subscription_tier=user.subscription_tier,
        credits=user.credits,
        preferred_template=getattr(user, 'preferred_template', 'detailed'),
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: CurrentUser):
    """Get current user's profile."""
    return _build_user_response(current_user)


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
        return _build_user_response(current_user)

    updated_user = await update_user(db, current_user.id, update_dict)
    return _build_user_response(updated_user)


# ============================================
# 템플릿 설정 API
# ============================================

@router.get("/me/templates", response_model=list[TemplateInfo])
async def list_templates():
    """사용 가능한 모든 템플릿 목록 조회."""
    return get_all_templates()


@router.get("/me/template", response_model=str)
async def get_preferred_template(current_user: CurrentUser):
    """현재 사용자의 선호 템플릿 조회."""
    return getattr(current_user, 'preferred_template', 'detailed')


@router.patch("/me/template", response_model=UserResponse)
async def update_preferred_template(
    request: TemplateUpdateRequest,
    current_user: CurrentUser,
    db: DbDep,
):
    """선호 템플릿 업데이트."""
    updated_user = await update_user(
        db, current_user.id,
        {"preferred_template": request.preferred_template.value}
    )
    return _build_user_response(updated_user)
