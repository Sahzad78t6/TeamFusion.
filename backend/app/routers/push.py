import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.config import settings
from app.db import get_db

logger = logging.getLogger("growthos.push_router")

router = APIRouter(prefix="/push", tags=["push"])

class PushKeysSchema(BaseModel):
    p256dh: str
    auth: str

class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: Dict[str, str]

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    return {"public_key": settings.VAPID_PUBLIC_KEY}

@router.post("/subscribe")
async def subscribe_push(
    payload: PushSubscribeRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])

    sub_doc = {
        "user_id": user_id,
        "endpoint": payload.endpoint,
        "keys": payload.keys,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    # Upsert subscription for user_id so re-subscribing replaces old endpoint
    await db["push_subscriptions"].update_one(
        {"user_id": user_id},
        {"$set": sub_doc},
        upsert=True
    )

    logger.info(f"Upserted push subscription for user_id={user_id}")
    return {"status": "subscribed", "user_id": user_id}
