from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "agentic-hr-api"
    api_prefix: str = "api/v1"
    debug: bool = False

    # Server
    host: str = "0.0.0.0"
    port: int = 3000

    # Database - use postgresql+asyncpg for async
    database_url: str = ""

    # JWT
    jwt_access_secret: str = "change-me-min-32-chars"
    jwt_refresh_secret: str = "change-me-refresh-min-32-chars"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    # CORS (env: CORS_ORIGIN or CORS_ORIGINS)
    cors_origins: str = Field("http://localhost:5173", validation_alias="CORS_ORIGIN")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
