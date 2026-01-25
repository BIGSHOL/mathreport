import asyncio
from logging.config import fileConfig
from urllib.parse import quote_plus

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context
from app.core.config import settings
from app.db.base import Base

config = context.config

# DATABASE_URL 동적 생성 (Supabase 개별 파라미터 사용)
if settings.use_supabase_db:
    password = quote_plus(settings.SUPABASE_DB_PASSWORD or "")
    db_url = (
        f"postgresql+asyncpg://{settings.SUPABASE_DB_USER}:{password}"
        f"@{settings.SUPABASE_DB_HOST}:{settings.SUPABASE_DB_PORT}"
        f"/{settings.SUPABASE_DB_NAME}"
    )
else:
    db_url = settings.DATABASE_URL

config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

from app.db.base import Base
from app.models.user import User  # noqa
from app.models.exam import Exam  # noqa
from app.models.analysis import AnalysisResult  # noqa

target_metadata = Base.metadata

def run_migrations_offline():
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
