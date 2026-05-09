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

    # Database - Supabase session pooler (or any PostgreSQL)
    # URL-encode special chars in password: @ -> %40, # -> %23
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

    # Only this user's email may call platform-admin APIs (company verify/reject, etc.) when set.
    admin_owner_email: str = Field("", validation_alias="ADMIN_OWNER_EMAIL")

    # Supabase Storage (for resumes/CVs)
    supabase_url: str = Field("", validation_alias="SUPABASE_URL")
    supabase_service_key: str = Field("", validation_alias="SUPABASE_SERVICE_KEY")
    supabase_bucket: str = "resumes"
    supabase_company_logos_bucket: str = Field("company-logos", validation_alias="SUPABASE_COMPANY_LOGOS_BUCKET")

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

    # Shared secret between the LiveKit agent and this backend.
    # The agent passes it via X-Agent-Secret header when posting session results.
    agent_secret: str = Field("", validation_alias="AGENT_SECRET")

    # Azure Cognitive Services — Computer Vision (S1) and Face API (Standard)
    # Used for post-interview video behaviour analysis.
    # Both can share the same endpoint if they live in the same Cognitive Services resource.
    azure_cv_endpoint: str = Field("", validation_alias="AZURE_CV_ENDPOINT")
    azure_cv_key: str = Field("", validation_alias="AZURE_CV_KEY")
    # If Face API lives in a separate resource set these; otherwise CV endpoint/key are reused.
    azure_face_endpoint: str = Field("", validation_alias="AZURE_FACE_ENDPOINT")
    azure_face_key: str = Field("", validation_alias="AZURE_FACE_KEY")

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
