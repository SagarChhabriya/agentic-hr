import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.models.user import User
from app.models.candidate_profile import CandidateProfile

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


import time

_clerk_cache: dict[str, tuple[dict, float]] = {}
_CLERK_CACHE_TTL = 300  # 5 minutes


def _fetch_clerk_user(clerk_id: str) -> dict | None:
    """Fetch full user object from Clerk API (cached for 5 min)."""
    now = time.monotonic()
    cached = _clerk_cache.get(clerk_id)
    if cached and (now - cached[1]) < _CLERK_CACHE_TTL:
        return cached[0]

    import os
    clerk_secret = os.getenv("CLERK_SECRET_KEY", "")
    if not clerk_secret:
        return None
    try:
        import httpx
        resp = httpx.get(
            f"https://api.clerk.com/v1/users/{clerk_id}",
            headers={"Authorization": f"Bearer {clerk_secret}"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            _clerk_cache[clerk_id] = (data, now)
            return data
        return None
    except Exception as e:
        logger.warning("Failed to fetch Clerk user %s: %s", clerk_id, e)
        return None


def _extract_clerk_details(udata: dict) -> tuple[str, str, str, str]:
    """Extract (email, first_name, last_name, role) from Clerk user data."""
    emails = udata.get("email_addresses", [])
    primary_id = udata.get("primary_email_address_id")
    email = ""
    for e in emails:
        if e.get("id") == primary_id:
            email = e.get("email_address", "")
            break
    if not email and emails:
        email = emails[0].get("email_address", "")
    first_name = udata.get("first_name") or ""
    last_name = udata.get("last_name") or ""
    md = udata.get("unsafe_metadata") or udata.get("public_metadata") or {}
    role = str(md.get("role", "CANDIDATE")).upper()
    if role not in ("ADMIN", "RECRUITER", "CANDIDATE"):
        role = "CANDIDATE"
    return email, first_name, last_name, role


async def _get_or_create_clerk_user(
    clerk_payload: dict, db: AsyncSession
) -> User | None:
    """Find a user by clerk_id; if missing, auto-provision from Clerk API."""
    clerk_id = clerk_payload.get("sub")
    if not clerk_id:
        return None

    result = await db.execute(select(User).where(User.clerk_id == clerk_id))
    user = result.scalar_one_or_none()

    # Always fetch from Clerk API to keep role in sync
    udata = _fetch_clerk_user(clerk_id)
    if udata:
        email, first_name, last_name, role = _extract_clerk_details(udata)
    else:
        email = clerk_payload.get("email", "") or ""
        first_name, last_name, role = "", "", "CANDIDATE"

    if user:
        # Sync role from Clerk metadata if it changed
        if udata and user.role != role:
            logger.info("Syncing role for %s: %s -> %s", clerk_id, user.role, role)
            user.role = role
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            await db.flush()
        return user

    if not email:
        logger.warning("Cannot auto-provision user %s: no email", clerk_id)
        return None

    # Check if email already exists (link clerk_id)
    result = await db.execute(select(User).where(User.email == email))
    existing = result.scalar_one_or_none()
    if existing:
        # New Clerk account reusing an email: same DB user row, new clerk_id. Drop stale candidate
        # profile + resume so a recreated account does not inherit the previous person's data.
        if existing.clerk_id and existing.clerk_id != clerk_id:
            prof_result = await db.execute(
                select(CandidateProfile).where(CandidateProfile.user_id == existing.id)
            )
            prof = prof_result.scalar_one_or_none()
            if prof:
                if prof.resume_url:
                    try:
                        from app.core.storage import delete_resume

                        delete_resume(prof.resume_url)
                    except Exception:
                        pass
                await db.delete(prof)
                await db.flush()

        existing.clerk_id = clerk_id
        existing.role = role
        if first_name:
            existing.first_name = first_name
        if last_name:
            existing.last_name = last_name
        await db.flush()
        return existing

    user = User(
        clerk_id=clerk_id,
        email=email,
        password=None,
        first_name=first_name,
        last_name=last_name,
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


async def require_platform_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Platform-level admin (verify companies, etc.).
    Requires role ADMIN. If ADMIN_OWNER_EMAIL is set in env, only that email may act.
    """
    settings = get_settings()
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403, detail="Admin only")
    owner = (settings.admin_owner_email or "").strip().lower()
    if owner:
        email = (current_user.email or "").strip().lower()
        if not email or email != owner:
            raise HTTPException(
                status_code=status.HTTP_403,
                detail="Not authorized for platform administration",
            )
    return current_user
