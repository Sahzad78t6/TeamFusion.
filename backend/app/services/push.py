import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from pywebpush import webpush, WebPushException
from app.config import settings
from app.db import get_db

logger = logging.getLogger("growthos.push")

async def send_push_async(user_id: str, title: str, body: str, url: str = "/") -> bool:
    """
    Looks up user's subscription in push_subscriptions collection and sends a web push notification.
    Deletes subscription if 410 Gone / expired. Swallows exceptions gracefully.
    """
    try:
        db = get_db()
        sub_doc = await db["push_subscriptions"].find_one({"user_id": user_id})
        if not sub_doc:
            logger.debug(f"No push subscription found for user {user_id}")
            return False

        subscription_info = {
            "endpoint": sub_doc.get("endpoint"),
            "keys": sub_doc.get("keys", {}),
        }

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url,
        })

        from py_vapid import Vapid
        pem_bytes = settings.VAPID_PRIVATE_KEY.replace("\\n", "\n").encode("utf-8")
        vapid_obj = Vapid.from_pem(pem_bytes)

        claims_email = settings.VAPID_CLAIMS_EMAIL or "mailto:admin@growthos.com"
        if not claims_email.startswith("mailto:"):
            claims_email = f"mailto:{claims_email}"

        # Execute blocking webpush call in thread pool
        def _do_webpush():
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=vapid_obj,
                vapid_claims={"sub": claims_email},
                timeout=10,
            )

        await asyncio.to_thread(_do_webpush)
        logger.info(f"Successfully sent push notification to user {user_id}: '{title}'")
        return True

    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None) if hasattr(exc, "response") else None
        logger.warning(f"WebPushException for user {user_id} (status: {status_code}): {exc}")
        if status_code == 410 or "410" in str(exc):
            logger.info(f"Push subscription for user {user_id} expired or revoked. Deleting subscription...")
            try:
                db = get_db()
                await db["push_subscriptions"].delete_one({"user_id": user_id})
            except Exception:
                pass
        return False
    except Exception as exc:
        logger.warning(f"Failed to send push notification to user {user_id}: {exc}")
        return False

def send_push(user_id: str, title: str, body: str, url: str = "/"):
    """
    Fire-and-forget sync wrapper for send_push_async. Safe to call anywhere without blocking.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(send_push_async(user_id, title, body, url))
    except RuntimeError:
        asyncio.run(send_push_async(user_id, title, body, url))
