from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import decode_access_token
from app.models.user import User

_bearer = HTTPBearer(auto_error=False)


def _verify_clerk_token(token: str) -> str | None:
    """Verify Clerk JWT and return clerk user id (sub) or None."""
    settings = get_settings()
    if not settings.clerk_jwks_url:
        return None
    try:
        import jwt
        from jwt import PyJWKClient
        jwks_client = PyJWKClient(settings.clerk_jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False, "verify_iss": False},
        )
        return payload.get("sub")
    except Exception:
        return None


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

    # 2) Try Clerk JWT
    clerk_sub = _verify_clerk_token(token)
    if clerk_sub:
        result = await db.execute(select(User).where(User.clerk_id == clerk_sub))
        user = result.scalar_one_or_none()
        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
