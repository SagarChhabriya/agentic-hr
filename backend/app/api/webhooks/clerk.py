"""
Clerk Webhook Handler for User Events
Handles user.created and user.updated events to sync users to database
and sync role to Clerk's publicMetadata so frontend can display it.
"""
import hmac
import hashlib
import os
from typing import Optional

from fastapi import APIRouter, Request, HTTPException, Header, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/webhooks/clerk", tags=["webhooks"])

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


def _update_clerk_public_metadata(clerk_id: str, role: str) -> None:
    """Set role in Clerk's publicMetadata so the frontend can read it."""
    if not CLERK_SECRET_KEY:
        return
    try:
        import httpx
        resp = httpx.patch(
            f"https://api.clerk.com/v1/users/{clerk_id}/metadata",
            headers={
                "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            json={"public_metadata": {"role": role}},
            timeout=10.0,
        )
        if resp.status_code >= 400:
            print(f"Clerk API update failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Clerk API update failed: {e}")


def verify_clerk_signature(payload: bytes, signature: str) -> bool:
    if not CLERK_WEBHOOK_SECRET:
        return True
    expected = hmac.new(
        CLERK_WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"v1={expected}", signature)


def _email_from_clerk(user_data: dict) -> str:
    emails = user_data.get("email_addresses") or []
    for e in emails:
        if e.get("id") == user_data.get("primary_email_address_id"):
            return e.get("email_address", "")
    return (emails[0] or {}).get("email_address", "") if emails else ""


def _name_from_clerk(user_data: dict) -> tuple[str, str]:
    fn = user_data.get("first_name") or ""
    ln = user_data.get("last_name") or ""
    return (fn, ln)


@router.post("/user")
async def handle_clerk_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    try:
        payload = await request.body()
        if svix_signature and not verify_clerk_signature(payload, svix_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")

        data = await request.json()
        event_type = data.get("type")
        user_data = data.get("data", {})

        if event_type == "user.created":
            clerk_id = user_data.get("id")
            email = _email_from_clerk(user_data)
            if not email:
                return JSONResponse({"status": "ignored", "reason": "no_email"})
            first_name, last_name = _name_from_clerk(user_data)
            metadata = user_data.get("unsafe_metadata") or user_data.get("public_metadata") or {}
            role = str(metadata.get("role", "CANDIDATE")).upper()
            if role not in ("ADMIN", "RECRUITER", "CANDIDATE"):
                role = "CANDIDATE"

            existing = await db.execute(select(User).where(User.clerk_id == clerk_id))
            if existing.scalar_one_or_none():
                return JSONResponse({"status": "success", "message": "already_exists"})

            existing_email = await db.execute(select(User).where(User.email == email))
            u = existing_email.scalar_one_or_none()
            if u:
                u.clerk_id = clerk_id
                u.role = role
                u.first_name = first_name or u.first_name
                u.last_name = last_name or u.last_name
                await db.flush()
                _update_clerk_public_metadata(clerk_id, role)
            else:
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
            _update_clerk_public_metadata(clerk_id, role)
            return JSONResponse({"status": "success", "message": "User created event processed"})

        elif event_type == "user.updated":
            clerk_id = user_data.get("id")
            result = await db.execute(select(User).where(User.clerk_id == clerk_id))
            u = result.scalar_one_or_none()
            if u:
                first_name, last_name = _name_from_clerk(user_data)
                metadata = user_data.get("unsafe_metadata") or user_data.get("public_metadata") or {}
                role = metadata.get("role")
                if first_name is not None:
                    u.first_name = first_name
                if last_name is not None:
                    u.last_name = last_name
                if role:
                    u.role = str(role).upper()
                    _update_clerk_public_metadata(clerk_id, str(role).upper())
                await db.flush()
            return JSONResponse({"status": "success", "message": "User updated event processed"})

        return JSONResponse({"status": "ignored", "event_type": event_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
