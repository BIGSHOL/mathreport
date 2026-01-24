"""사용자 확인 및 생성/비밀번호 재설정 스크립트"""
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User


async def check_user(email: str):
    """사용자 존재 여부 확인"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            print(f"✅ 사용자 존재: {user.nickname} ({email})")
            print(f"   - ID: {user.id}")
            print(f"   - 활성화: {user.is_active}")
            print(f"   - MASTER: {user.is_superuser}")
            print(f"   - 구독: {user.subscription_tier}")
            return user
        else:
            print(f"❌ 사용자 없음: {email}")
            return None


async def create_user(email: str, password: str, nickname: str = None):
    """새 사용자 생성"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 이미 존재하는지 확인
        result = await session.execute(select(User).where(User.email == email))
        if result.scalar_one_or_none():
            print(f"⚠️ 이미 존재하는 이메일: {email}")
            return None

        user = User(
            email=email,
            hashed_password=get_password_hash(password),
            nickname=nickname or email.split('@')[0],
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

        print(f"✅ 사용자 생성됨: {user.nickname} ({email})")
        return user


async def reset_password(email: str, new_password: str):
    """비밀번호 재설정"""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            print(f"❌ 사용자 없음: {email}")
            return False

        user.hashed_password = get_password_hash(new_password)
        await session.commit()

        print(f"✅ 비밀번호 재설정됨: {email}")
        return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("사용법:")
        print("  확인: python check_user.py <email>")
        print("  생성: python check_user.py <email> --create <password> [nickname]")
        print("  비번재설정: python check_user.py <email> --reset <new_password>")
        sys.exit(1)

    email = sys.argv[1]

    if len(sys.argv) >= 4 and sys.argv[2] == "--create":
        password = sys.argv[3]
        nickname = sys.argv[4] if len(sys.argv) > 4 else None
        asyncio.run(create_user(email, password, nickname))
    elif len(sys.argv) >= 4 and sys.argv[2] == "--reset":
        new_password = sys.argv[3]
        asyncio.run(reset_password(email, new_password))
    else:
        asyncio.run(check_user(email))
