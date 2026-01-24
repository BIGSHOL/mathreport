from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/app"
    SECRET_KEY: str = "changeme"
    GEMINI_API_KEY: str | None = None
    GEMINI_MODEL_NAME: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
