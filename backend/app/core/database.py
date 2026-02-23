from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Supabase and most Postgres support async via asyncpg
# If DATABASE_URL is postgresql://, convert to postgresql+asyncpg://
url = settings.database_url or ""
# Use postgresql+asyncpg for async driver
if url and url.startswith("postgresql://") and "asyncpg" not in url:
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

import ssl
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine( 
    url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=0,
    connect_args={"ssl": ssl_context}
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
