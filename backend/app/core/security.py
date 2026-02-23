from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings

# Use pbkdf2_sha256 for password hashing.
# It does not have the 72‑byte input limit that bcrypt has and is widely used in production.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(sub: str, email: str, role: str) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_expire_minutes)
    payload = {"sub": sub, "email": email, "role": role, "exp": expire, "type": "access"}
    return jwt.encode(
        payload,
        settings.jwt_access_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(sub: str) -> str:
    settings = get_settings()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_expire_days)
    payload = {"sub": sub, "exp": expire, "type": "refresh"}
    return jwt.encode(
        payload,
        settings.jwt_refresh_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_access_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            return None
        return payload
    except JWTError:
        return None


def decode_refresh_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_refresh_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "refresh":
            return None
        return payload
    except JWTError:
        return None
