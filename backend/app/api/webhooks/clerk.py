"""
Clerk Webhook Handler for User Events
Handles user.created and user.updated events to sync role metadata
"""
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
import hmac
import hashlib
import os
from typing import Optional

router = APIRouter(prefix="/webhooks/clerk", tags=["webhooks"])

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET", "")


def verify_clerk_signature(payload: bytes, signature: str) -> bool:
    """Verify Clerk webhook signature"""
    if not CLERK_WEBHOOK_SECRET:
        return True  # Skip verification in dev mode if secret not set
    
    expected_signature = hmac.new(
        CLERK_WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"v1={expected_signature}", signature)


@router.post("/user")
async def handle_clerk_webhook(
    request: Request,
    svix_id: Optional[str] = Header(None, alias="svix-id"),
    svix_timestamp: Optional[str] = Header(None, alias="svix-timestamp"),
    svix_signature: Optional[str] = Header(None, alias="svix-signature"),
):
    """
    Handle Clerk webhook events for user creation/updates
    This ensures role metadata from signup is properly synced
    """
    try:
        payload = await request.body()
        
        # Verify signature if secret is configured
        if svix_signature and not verify_clerk_signature(payload, svix_signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        data = await request.json()
        event_type = data.get("type")
        
        if event_type == "user.created":
            user_data = data.get("data", {})
            user_id = user_data.get("id")
            metadata = user_data.get("unsafe_metadata", {})
            role = metadata.get("role")
            
            # TODO: Sync user to your database here
            # For now, just log it
            print(f"User created: {user_id} with role: {role}")
            
            return JSONResponse({
                "status": "success",
                "message": "User created event processed",
                "user_id": user_id,
                "role": role
            })
        
        elif event_type == "user.updated":
            user_data = data.get("data", {})
            user_id = user_data.get("id")
            metadata = user_data.get("unsafe_metadata", {})
            role = metadata.get("role")
            
            # TODO: Update user in your database
            print(f"User updated: {user_id} with role: {role}")
            
            return JSONResponse({
                "status": "success",
                "message": "User updated event processed",
                "user_id": user_id,
                "role": role
            })
        
        return JSONResponse({"status": "ignored", "event_type": event_type})
    
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
