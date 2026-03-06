import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import engine, Base
import app.models  # noqa: F401 - ensure all models are registered for create_all
from app.api.auth import router as auth_router
from app.api.jobs import router as jobs_router
from app.api.applications import router as applications_router
from app.api.custom_questions import router as custom_questions_router
from app.api.assessments import router as assessments_router
from app.api.profile import router as profile_router
from app.api.ai import router as ai_router
from app.api.dashboard import router as dashboard_router
from app.api.interviews import router as interviews_router
from app.api.webhooks.clerk import router as clerk_webhook_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (may skip if already exist)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        if "already exists" in str(e):
            logger.info("Tables already exist (concurrent worker race) — safe to ignore")
        else:
            logger.exception("Database create_all failed: %s", e)

    # Always run migrations (add missing columns to existing tables)
    try:
        from app.core.migrations import run_startup_migrations
        await run_startup_migrations(engine)
        logger.info("Startup migrations completed")
    except Exception as e:
        logger.exception("Startup migrations failed — app may not work correctly: %s", e)
        raise

    # Warn if email is not configured (assessment/status emails will be skipped)
    s = get_settings()
    if not s.resend_api_key:
        logger.warning(
            "RESEND_API_KEY not set — all emails (assessment links, status updates, etc.) will be skipped. "
            "Add RESEND_API_KEY to .env to enable email. See env.example."
        )

    yield
    await engine.dispose()


app = FastAPI(
    title="Agentic HR API",
    description="Backend API for HR Automation SaaS Platform",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
# Normalize origins: strip trailing slashes so https://x.com and https://x.com/ both work
_origins = [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Mount all API routes under the configured prefix, e.g. /api/v1.
# Auth router then contributes /auth/... underneath, e.g. /api/v1/auth/login.
app.include_router(auth_router, prefix=f"/{settings.api_prefix}")
app.include_router(jobs_router, prefix=f"/{settings.api_prefix}")
app.include_router(applications_router, prefix=f"/{settings.api_prefix}")
app.include_router(custom_questions_router, prefix=f"/{settings.api_prefix}")
app.include_router(assessments_router, prefix=f"/{settings.api_prefix}")
app.include_router(profile_router, prefix=f"/{settings.api_prefix}")
app.include_router(ai_router, prefix=f"/{settings.api_prefix}")
app.include_router(dashboard_router, prefix=f"/{settings.api_prefix}")
app.include_router(interviews_router, prefix=f"/{settings.api_prefix}")

# Webhook routes (no API prefix needed)
app.include_router(clerk_webhook_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "agentic-hr-backend"}


@app.get("/health/email")
def health_email():
    """Check if email (Resend) is configured. Does not expose secrets."""
    s = get_settings()
    configured = bool(s.resend_api_key)
    return {
        "status": "ok" if configured else "not_configured",
        "email_configured": configured,
        "message": "Emails will be sent" if configured else "RESEND_API_KEY not set — emails skipped",
    }


@app.get("/health/db")
async def health_db():
    """Probe database connectivity. Use to verify PostgreSQL firewall/connection."""
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": "disconnected", "error": str(e)}


@app.get("/")
def root():
    return {"service": "agentic-hr-api", "version": "0.1.0", "docs": "/docs"}
