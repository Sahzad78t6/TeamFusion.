import logging
from datetime import datetime, timedelta, timezone
from app.db import get_db
from app.services.push import send_push_async

logger = logging.getLogger("growthos.inactivity_job")

async def check_inactive_users():
    """
    Periodic job that checks user inactivity and sends Web Push notifications:
    - 1 day inactive (yesterday): "Don't lose your streak! 🔥"
    - 2 days inactive (2 days ago): "We miss you at GrowthOS"
    - 3+ days inactive: No push.
    """
    try:
        db = get_db()
        now = datetime.now(timezone.utc)
        yesterday_str = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        two_days_ago_str = (now - timedelta(days=2)).strftime("%Y-%m-%d")

        logger.info(f"Running check_inactive_users: yesterday={yesterday_str}, two_days_ago={two_days_ago_str}")

        # 1. Users inactive for 1 day
        cursor_1 = db["users"].find({"last_active_date": yesterday_str})
        users_1 = await cursor_1.to_list(1000)
        for user in users_1:
            user_id = str(user["_id"])
            await send_push_async(
                user_id=user_id,
                title="Don't lose your streak! 🔥",
                body="You haven't checked in today — pick up where you left off.",
                url="/dashboard"
            )

        # 2. Users inactive for 2 days
        cursor_2 = db["users"].find({"last_active_date": two_days_ago_str})
        users_2 = await cursor_2.to_list(1000)
        for user in users_2:
            user_id = str(user["_id"])
            await send_push_async(
                user_id=user_id,
                title="We miss you at GrowthOS",
                body="It's been 2 days — your roadmap is waiting whenever you're ready.",
                url="/dashboard"
            )

        logger.info(f"Processed inactivity checks: {len(users_1)} 1-day inactive, {len(users_2)} 2-day inactive users.")
    except Exception as exc:
        logger.error(f"Error in check_inactive_users job: {exc}")
