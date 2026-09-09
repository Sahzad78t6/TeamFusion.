from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.db import get_db

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/achievements", status_code=status.HTTP_200_OK)
async def get_user_achievements(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    docs = await db["achievements"].find({"user_id": user_id}).sort("unlocked_at", -1).to_list(500)
    return [
        {
            "id": str(d["_id"]),
            "badge_code": d.get("badge_code", ""),
            "label": d.get("label", ""),
            "description": d.get("description", ""),
            "icon": d.get("icon", "trophy"),
            "unlocked_at": d.get("unlocked_at", ""),
        }
        for d in docs
    ]

@router.get("/credentials", status_code=status.HTTP_200_OK)
async def get_user_credentials(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    docs = await db["credentials"].find({"user_id": user_id}).sort("issued_at", -1).to_list(500)
    return [
        {
            "id": str(d["_id"]),
            "title": d.get("title", ""),
            "type": d.get("type", "roadmap_completion"),
            "issued_at": d.get("issued_at", ""),
            "verify_code": d.get("verify_code", "GX0000"),
            "detail": d.get("detail", {}),
        }
        for d in docs
    ]

@router.get("/journey", status_code=status.HTTP_200_OK)
async def get_user_learning_journey(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id}) or {}
    completed_codes = progress.get("completed_topics", [])
    completed_dates = progress.get("completed_dates", {})

    goal = progress.get("goal") or current_user.get("goal") or "software_engineering"
    year = progress.get("year") or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    seq_map = {item["topic_code"]: item for item in sequence if "topic_code" in item}

    journey_items = []
    for idx, code in enumerate(completed_codes, start=1):
        item_info = seq_map.get(code, {})
        journey_items.append({
            "step": idx,
            "topic_code": code,
            "label": item_info.get("label", code.replace("_", " ").title()),
            "dimension": item_info.get("dimension", "General"),
            "phase": item_info.get("phase", "Learning Phase"),
            "completed_at": completed_dates.get(code) or datetime.now(timezone.utc).isoformat(),
        })

    return journey_items

@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_user_profile_stats(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])

    progress = await db["user_progress"].find_one({"user_id": user_id}) or {}
    completed_count = len(progress.get("completed_topics", []))

    c_streak = int(current_user.get("current_streak") or current_user.get("streak") or 0)
    l_streak = int(current_user.get("longest_streak") or c_streak)

    assessments_count = await db["submissions"].count_documents({"user_id": str(user_id)})
    contests_count = await db["code_submissions"].count_documents({"user_id": ObjectId(user_id)})

    return {
        "completed_topics_count": completed_count,
        "current_streak": c_streak,
        "longest_streak": l_streak,
        "assessments_count": assessments_count,
        "contests_count": contests_count,
    }
