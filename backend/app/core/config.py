import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_env_file() -> str | None:
    """Railway 환경에서는 환경 변수만 사용, 로컬에서는 .env 파일 사용"""
    if os.getenv("RAILWAY_ENVIRONMENT"):
        return None
    env_path = Path(__file__).resolve().parents[2] / ".env"
    return str(env_path) if env_path.exists() else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=get_env_file(),
        extra="ignore",
        case_sensitive=True,
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"

    # Supabase Database (개별 파라미터 - asyncpg 직접 연결용)
    SUPABASE_DB_HOST: str | None = None
    SUPABASE_DB_PORT: int = 5432
    SUPABASE_DB_USER: str | None = None
    SUPABASE_DB_PASSWORD: str | None = None
    SUPABASE_DB_NAME: str = "postgres"

    # Security
    SECRET_KEY: str = "changeme"

    # AI
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL_NAME: str = "gemini-2.5-flash"

    # Supabase (for Storage & Auth)
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    SUPABASE_JWT_SECRET: str | None = None  # Supabase Auth JWT 검증용

    # CORS - 쉼표로 구분된 허용 도메인 목록
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:5174,https://math-report.vercel.app"

    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production

    @property
    def use_supabase_db(self) -> bool:
        """Supabase DB 사용 여부"""
        return self.DATABASE_URL == "supabase" or (
            self.SUPABASE_DB_HOST is not None and
            self.SUPABASE_DB_USER is not None
        )

    # 프로덕션 CORS 필수 도메인 (환경변수와 무관하게 항상 포함)
    _REQUIRED_ORIGINS: list[str] = [
        "https://math-report.vercel.app",
    ]

    @property
    def cors_origins_list(self) -> list[str]:
        """CORS origins를 리스트로 반환 (필수 도메인 항상 포함)"""
        origins = [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        for req in self._REQUIRED_ORIGINS:
            if req not in origins:
                origins.append(req)
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"


settings = Settings()
