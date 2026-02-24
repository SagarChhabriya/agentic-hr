import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


def _verify_clerk_token(token: str) -> dict | None:
    """Verify Clerk JWT and return the full payload or None."""
    settings = get_settings()
    jwks_url = settings.clerk_jwks_url
    if not jwks_url:
        # Auto-derive from the token's issuer if CLERK_JWKS_URL not set
        try:
            import jwt as pyjwt
            unverified = pyjwt.decode(token, options={"verify_signature": False})
            iss = unverified.get("iss", "")
            if ".clerk." in iss:
                jwks_url = f"{iss.rstrip('/')}/.well-known/jwks.json"
        except Exception:
            return None
    if not jwks_url:
        return None
    try:
        import jwt
        from jwt import PyJWKClient
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False, "verify_iss": False},
        )
        return payload
    except Exception as e:
        logger.debug("Clerk token verification failed: %s", e)
        return None


async def _get_or_create_clerk_user(
    clerk_payload: dict, db: AsyncSession
) -> User | None:
    """Find a user by clerk_id; if missing, auto-provision from the token claims."""
    clerk_id = clerk_payload.get("sub")
    if not clerk_id:
        return None

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()
    if user:
        return user

    # Auto-provision: extract info from Clerk JWT claims
    email = clerk_payload.get("email", "") or ""
    # Clerk session tokens may include user metadata
    metadata = clerk_payload.get("public_metadata") or clerk_payload.get("unsafe_metadata") or {}
    role = str(metadata.get("role", "CANDIDATE")).upper()
    if role not in ("ADMIN", "RECRUITER", "CANDIDATE"):
        role = "CANDIDATE"

    if not email:
        # Try fetching from Clerk API
        import os
        clerk_secret = os.getenv("CLERK_SECRET_KEY", "")
        if clerk_secret:
            try:
                import httpx
                resp = httpx.get(
                    f"https://api.clerk.com/v1/users/{clerk_id}",
                    headers={"Authorization": f"Bearer {clerk_secret}"},
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    udata = resp.json()
                    emails = udata.get("email_addresses", [])
                    primary_id = udata.get("primary_email_address_id")
                    for e in emails:
                        if e.get("id") == primary_id:
                            email = e.get("email_address", "")
                            break
                    if not email and emails:
                        email = emails[0].get("email_address", "")
                    md = udata.get("public_metadata") or udata.get("unsafe_metadata") or {}
                    r = str(md.get("role", role)).upper()
                    if r in ("ADMIN", "RECRUITER", "CANDIDATE"):
                        role = r
            except Exception as e:
                logger.warning("Failed to fetch Clerk user %s: %s", clerk_id, e)

    if not email:
        logger.warning("Cannot auto-provision user %s: no email", clerk_id)
        return None

    # Check if email already exists (link clerk_id)
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        existing.clerk_id = clerk_id
        await db.flush()
        return existing

    user = User(
        clerk_id=clerk_id,
        email=email,
        password=None,
        first_name="",
        last_name="",
        role=role,
    )
    db.add(user)
    await db.flush()
    logger.info("Auto-provisioned user %s (%s) as %s", clerk_id, email, role)
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials

    # 1) Try our own JWT
    payload = decode_access_token(token)
    if payload:
        user_id = payload.get("sub")
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                return user

    # 2) Try Clerk JWT (auto-derives JWKS URL if not configured)
    clerk_payload = _verify_clerk_token(token)
    if clerk_payload:
        user = await _get_or_create_clerk_user(clerk_payload, db)
        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
