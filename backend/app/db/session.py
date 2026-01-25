import ssl
from urllib.parse import quote_plus
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import URL

from app.core.config import settings

# 연결 정보 디버깅
print(f"[DB Config] use_supabase_db: {settings.use_supabase_db}")
if settings.use_supabase_db:
    print(f"[DB Config] Host: {settings.SUPABASE_DB_HOST}")
    print(f"[DB Config] Port: {settings.SUPABASE_DB_PORT}")
    print(f"[DB Config] User: {settings.SUPABASE_DB_USER}")
    print(f"[DB Config] Password: {'*' * len(settings.SUPABASE_DB_PASSWORD) if settings.SUPABASE_DB_PASSWORD else 'NOT SET'}")
    print(f"[DB Config] Database: {settings.SUPABASE_DB_NAME}")

# Supabase 사용 시 URL.create()로 연결 (URL 인코딩 문제 완전 우회)
if settings.use_supabase_db:
    # 사용자 이름의 점(.)을 명시적으로 URL 인코딩
    encoded_user = settings.SUPABASE_DB_USER.replace(".", "%2E")
    encoded_password = quote_plus(settings.SUPABASE_DB_PASSWORD)

    # 직접 URL 문자열 구성 (점이 인코딩된 상태로)
    database_url = (
        f"postgresql+asyncpg://{encoded_user}:{encoded_password}"
        f"@{settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}"
        f"/{settings.SUPABASE_DB_NAME}"
    )

    print(f"[DB Config] Using manually encoded URL")
    print(f"[DB Config] Encoded user: {encoded_user}")

    # Supabase Pooler (PgBouncer)는 prepared statements 미지원
    # SSL 활성화
    connect_args = {
        "ssl": "require",
        "prepared_statement_cache_size": 0,
        "statement_cache_size": 0,
    }
else:
    database_url = settings.DATABASE_URL
    connect_args = {}

engine = create_async_engine(
    database_url,
    echo=True,
    connect_args=connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
