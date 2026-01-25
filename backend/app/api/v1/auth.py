"""
Authentication endpoints.
FEAT-0: 인증/인가

Supabase Auth를 사용하므로 회원가입, 로그인, 토큰 갱신은 프론트엔드에서 직접 처리합니다.
백엔드는 Supabase에서 발급한 JWT를 검증하고 사용자 정보를 동기화합니다.
"""

from fastapi import APIRouter

from app.core.deps import CurrentUser

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/logout")
async def logout(current_user: CurrentUser):
    """
    로그아웃 엔드포인트

    Supabase Auth에서는 클라이언트에서 supabase.auth.signOut()을 호출합니다.
    서버 측에서는 특별한 처리가 필요 없으나, 호환성을 위해 유지합니다.
    """
    return {"message": "로그아웃되었습니다"}
