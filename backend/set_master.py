"""
MASTER 계정 설정 스크립트

사용법:
    python set_master.py <email>
    python set_master.py user@example.com

MASTER 계정 해제:
    python set_master.py <email> --remove
"""
import asyncio
import sys

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models.user import User


async def set_master(email: str, is_master: bool = True):
    """사용자를 MASTER로 설정하거나 해제합니다."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 사용자 조회
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ 사용자를 찾을 수 없습니다: {email}")
            return False

        # MASTER 설정
        user.is_superuser = is_master
        await session.commit()

        status = "MASTER로 설정" if is_master else "일반 사용자로 변경"
        print(f"✅ {user.nickname} ({email}) - {status}되었습니다.")

        if is_master:
            print("   - 모든 기능 무제한 사용 가능")
            print("   - 구독/크레딧 제한 없음")

        return True


async def list_masters():
    """모든 MASTER 계정을 조회합니다."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.is_superuser == True)
        )
        masters = result.scalars().all()

        if not masters:
            print("📋 등록된 MASTER 계정이 없습니다.")
            return

        print(f"📋 MASTER 계정 목록 ({len(masters)}명):")
        for user in masters:
            print(f"   - {user.nickname} ({user.email})")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        print("\n현재 MASTER 계정 조회:")
        asyncio.run(list_masters())
        sys.exit(0)

    email = sys.argv[1]

    if email == "--list":
        asyncio.run(list_masters())
    elif len(sys.argv) > 2 and sys.argv[2] == "--remove":
        asyncio.run(set_master(email, is_master=False))
    else:
        asyncio.run(set_master(email, is_master=True))
