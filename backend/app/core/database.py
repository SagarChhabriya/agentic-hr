from urllib.parse import quote, urlparse, parse_qs, urlencode, urlunparse
import ssl
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

settings = get_settings()

# Supabase and most Postgres support async via asyncpg
# If DATABASE_URL is postgresql://, convert to postgresql+asyncpg://
url = settings.database_url or ""


def _normalize_database_url(raw: str) -> str:
    """Fix malformed URLs from various Azure Portal / .env copy-paste issues."""
    if not raw:
        return raw
    # Strip accidental 'KEY=value' format (e.g. Azure Portal copy-paste of full .env line)
    if raw.startswith("DATABASE_URL="):
        raw = raw[len("DATABASE_URL="):]
    if not raw.startswith("postgresql:"):
        return raw
    # Already correct format
    if raw.startswith("postgresql://"):
        return raw
    # Contains backslashes - Azure Portal / Windows-style format
    if "\\" not in raw:
        return raw
    rest = raw.replace("postgresql:\\", "postgresql://", 1).replace("\\", "/")
    host_marker = ".postgres.database.azure.com"
    idx = rest.find(host_marker)
    if idx <= 0:
        return rest if rest.startswith("postgresql://") else f"postgresql://{rest}"
    at = rest.rfind("@", 0, idx)
    if at <= 0:
        return rest
    creds, host_part = rest[:at].replace("postgresql://", ""), rest[at + 1:]
    if ":" not in creds:
        return rest
    user, _, password = creds.partition(":")
    password_enc = quote(password, safe="")
    if ":5432" not in host_part and ".com/" in host_part:
        host_part = host_part.replace(".com/", ".com:5432/", 1)
    return f"postgresql://{user}:{password_enc}@{host_part}"


url = _normalize_database_url(url)

# asyncpg doesn't accept sslmode as a URL param; SSL is handled via connect_args
if "sslmode=" in url:
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    params.pop("sslmode", None)
    cleaned_query = urlencode(params, doseq=True)
    url = urlunparse(parsed._replace(query=cleaned_query))

# Use postgresql+asyncpg for async driver
if url and url.startswith("postgresql://") and "asyncpg" not in url:
    url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    url,
    echo=settings.debug,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=0,
    connect_args={"ssl": ssl_context},
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
