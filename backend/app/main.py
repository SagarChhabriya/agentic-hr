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
from app.api.webhooks.clerk import router as clerk_webhook_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created/verified successfully")
    except Exception as e:
        logger.exception("Database startup failed (app will start; DB routes may fail): %s", e)
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

# Webhook routes (no API prefix needed)
app.include_router(clerk_webhook_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "agentic-hr-backend"}


@app.get("/")
def root():
    return {"service": "agentic-hr-api", "version": "0.1.0", "docs": "/docs"}
