from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "agentic-hr-api"
    api_prefix: str = "api/v1"
    debug: bool = Field(False, validation_alias="APP_DEBUG")

    # Server (PORT from env on Azure/Railway/etc.)
    host: str = "0.0.0.0"
    port: int = Field(3000, validation_alias="PORT")

    # Database - Azure PostgreSQL or Supabase
    # Azure format: postgresql://user%40server:password@server.postgres.database.azure.com:5432/db?sslmode=require
    # URL-encode special chars: @ -> %40, # -> %23
    database_url: str = ""

    # JWT
    jwt_access_secret: str = "change-me-min-32-chars"
    jwt_refresh_secret: str = "change-me-refresh-min-32-chars"
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 7
    jwt_algorithm: str = "HS256"

    # CORS - comma-separated origins (e.g. https://hire-base.vercel.app,http://localhost:5173)
    cors_origins: str = Field(
        "http://localhost:5173,https://hire-base.vercel.app",
        validation_alias="CORS_ORIGIN",
    )

    # Clerk - JWKS URL for verifying session tokens (e.g. https://xxx.clerk.accounts.dev/.well-known/jwks.json)
    clerk_jwks_url: str = Field("", validation_alias="CLERK_JWKS_URL")

    # Supabase Storage (for resumes/CVs)
    supabase_url: str = Field("", validation_alias="SUPABASE_URL")
    supabase_service_key: str = Field("", validation_alias="SUPABASE_SERVICE_KEY")
    supabase_bucket: str = "resumes"

    # Email (Resend)
    resend_api_key: str = Field("", validation_alias="RESEND_API_KEY")
    email_from: str = Field("noreply@hire-base.vercel.app", validation_alias="EMAIL_FROM")
    frontend_url: str = Field(
        "https://hire-base.vercel.app",
        validation_alias="FRONTEND_URL",
    )

    # AI / LLM (Groq)
    groq_api_key: str = Field("", validation_alias="GROQ_API_KEY")

    # LiveKit (AI video interviews)
    livekit_url: str = Field("", validation_alias="LIVEKIT_URL")
    livekit_api_key: str = Field("", validation_alias="LIVEKIT_API_KEY")
    livekit_api_secret: str = Field("", validation_alias="LIVEKIT_API_SECRET")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
