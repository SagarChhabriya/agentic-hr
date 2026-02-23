from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.core.config import get_settings
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.schemas.auth import RegisterBody, LoginBody, RefreshBody, TokenResponse, UserResponse
from app.api.deps import get_current_user

# All auth routes live under /auth (combined with API prefix in main.py)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(body: RegisterBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    role = "RECRUITER" if body.role == "RECRUITER" else "CANDIDATE"
    user = User(
        email=body.email,
        password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        role=role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return {
        "message": "User registered successfully",
        "user": UserResponse.model_validate(user),
    }


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    access_token = create_access_token(str(user.id), user.email, user.role)
    expires_at = datetime.utcnow() + timedelta(days=get_settings().jwt_refresh_expire_days)
    refresh_token_str = create_refresh_token(str(user.id))
    refresh_record = RefreshToken(token=refresh_token_str, user_id=user.id, expires_at=expires_at)
    db.add(refresh_record)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token_str,
        user=UserResponse.model_validate(user),
    )


@router.get("/profile", response_model=UserResponse)
async def profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshBody, db: AsyncSession = Depends(get_db)):
    payload = decode_refresh_token(body.refresh_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    result = await db.execute(select(RefreshToken).where(RefreshToken.token == body.refresh_token))
    token_record = result.scalar_one_or_none()
    if not token_record or token_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")
    await db.delete(token_record)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    access_token = create_access_token(str(user.id), user.email, user.role)
    expires_at = datetime.utcnow() + timedelta(days=get_settings().jwt_refresh_expire_days)
    new_refresh = create_refresh_token(str(user.id))
    db.add(RefreshToken(token=new_refresh, user_id=user.id, expires_at=expires_at))
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh,
        user=UserResponse.model_validate(user),
    )
