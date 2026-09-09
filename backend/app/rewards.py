from datetime import datetime, timezone
import random
import string
import logging

logger = logging.getLogger("growthos.rewards")

def _generate_verify_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))

DEFAULT_BADGES = {
    "first_topic_complete": {
        "label": "First Step",
        "description": "Completed your first learning topic",
        "icon": "🎯",
    },
    "streak_7": {
        "label": "Consistency Champion",
        "description": "Maintained a 7-day learning streak",
        "icon": "🔥",
    },
    "roadmap_complete": {
        "label": "Roadmap Master",
        "description": "Completed all topics in your learning pathway",
        "icon": "🏆",
    },
    "quiz_ace": {
        "label": "Quiz Ace",
        "description": "Scored 90%+ on an assessment quiz",
        "icon": "⚡",
    },
    "contest_solver": {
        "label": "Code Conqueror",
        "description": "Passed all test cases in a coding contest problem",
        "icon": "💻",
    },
}

async def award_achievement_if_not_exists(
    db,
    user_id: str,
    badge_code: str,
    label: str = None,
    description: str = None,
    icon: str = None,
) -> bool:
    try:
        existing = await db["achievements"].find_one({"user_id": user_id, "badge_code": badge_code})
        if existing:
            return False

        meta = DEFAULT_BADGES.get(badge_code, {})
        final_label = label or meta.get("label", badge_code.replace("_", " ").title())
        final_desc = description or meta.get("description", "Unlocked a new achievement")
        final_icon = icon or meta.get("icon", "🏆")

        doc = {
            "user_id": user_id,
            "badge_code": badge_code,
            "label": final_label,
            "description": final_desc,
            "icon": final_icon,
            "unlocked_at": datetime.now(timezone.utc).isoformat(),
        }
        await db["achievements"].insert_one(doc)
        logger.info(f"Awarded badge '{badge_code}' to user {user_id}")
        return True
    except Exception as exc:
        logger.warning(f"Error awarding achievement {badge_code} to {user_id}: {exc}")
        return False

async def issue_credential_if_not_exists(
    db, user_id: str, cred_type: str, title: str, detail: dict
) -> bool:
    try:
        existing = await db["credentials"].find_one({
            "user_id": user_id,
            "type": cred_type,
            "title": title
        })
        if existing:
            return False
        doc = {
            "user_id": user_id,
            "title": title,
            "type": cred_type,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "verify_code": f"GX{_generate_verify_code(4)}",
            "detail": detail
        }
        await db["credentials"].insert_one(doc)
        logger.info(f"Issued credential '{title}' to user {user_id}")
        return True
    except Exception as exc:
        logger.warning(f"Error issuing credential {title} to {user_id}: {exc}")
        return False
