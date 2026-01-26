"""관리자 권한 부여 스크립트."""
import asyncio
import sys
sys.path.insert(0, str(__file__).replace("\\scripts\\make_admin.py", ""))

from app.db.supabase_client import get_supabase, close_supabase


async def make_admin(email: str):
    """특정 이메일의 사용자를 관리자로 만듭니다."""
    db = get_supabase()

    # 먼저 사용자가 존재하는지 확인
    result = await db.table("users").select("id, email, is_superuser").eq("email", email).execute()

    if result.error:
        print(f"오류: {result.error}")
        return

    if not result.data:
        print(f"사용자를 찾을 수 없습니다: {email}")
        return

    user = result.data[0] if isinstance(result.data, list) else result.data
    print(f"사용자 발견: {user}")

    if user.get("is_superuser"):
        print(f"{email}은(는) 이미 관리자입니다.")
        return

    # 관리자 권한 부여
    update_result = await db.table("users").eq("email", email).update({
        "is_superuser": True
    }).execute()

    if update_result.error:
        print(f"업데이트 오류: {update_result.error}")
        return

    print(f"성공! {email}에게 관리자 권한을 부여했습니다.")
    print(f"업데이트된 데이터: {update_result.data}")

    await close_supabase()


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else "st2000423@gmail.com"
    asyncio.run(make_admin(email))
