from urllib.parse import quote
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Supabase and most Postgres support async via asyncpg
# If DATABASE_URL is postgresql://, convert to postgresql+asyncpg://
url = settings.database_url or ""

# Fix malformed URL: postgresql:\user:password@host\db?params (backslashes, unencoded password)
if url and url.startswith("postgresql:\\"):
    # Strip prefix, then split: user:password@host\db?params
    rest = url[len("postgresql:\\"):].replace("\\", "/")
    # Find @ before host (Azure host: *.postgres.database.azure.com)
    host_marker = ".postgres.database.azure.com"
    idx = rest.find(host_marker)
    if idx > 0:
        at = rest.rfind("@", 0, idx)
        if at > 0:
            creds, host_part = rest[:at], rest[at + 1:]
            if ":" in creds:
                user, _, password = creds.partition(":")
                password_enc = quote(password, safe="")
                host_part = host_part.replace(".com/", ".com:5432/", 1) if ":5432" not in host_part and ".com/" in host_part else host_part
                url = f"postgresql://{user}:{password_enc}@{host_part}"
            else:
                url = f"postgresql://{rest}"
    else:
        url = f"postgresql://{rest}"

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
