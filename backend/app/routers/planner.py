from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.curriculum_utils import get_current_topic
from app.db import get_db
from app.models import TaskUpdateRequest

router = APIRouter(prefix="/planner", tags=["planner"])

@router.get("", status_code=status.HTTP_200_OK)
async def get_planner_tasks(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id})

    goal = (progress.get("goal") if progress else None) or current_user.get("goal") or "software_engineering"
    year = (progress.get("year") if progress else None) or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_topics = progress.get("completed_topics", []) if progress else []
    current_topic = get_current_topic(sequence, completed_topics)

    if not sequence or not current_topic:
        return []

    today_iso = date.today().isoformat()

    return [
        {
            "id": current_topic["topic_code"],
            "title": current_topic["label"],
            "category": "learning",
            "priority": "high",
            "time": "09:00 AM",
            "duration": "45 mins",
            "isCompleted": False,
            "date": today_iso,
            "type": "learning",
        }
    ]

@router.patch("/tasks/{task_id}", status_code=status.HTTP_200_OK)
async def update_planner_task(
    task_id: str,
    payload: Optional[TaskUpdateRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id})

    goal = (progress.get("goal") if progress else None) or current_user.get("goal") or "software_engineering"
    year = (progress.get("year") if progress else None) or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_topics = progress.get("completed_topics", []) if progress else []
    current_topic = get_current_topic(sequence, completed_topics)

    if current_topic:
        expected_topic_code = current_topic["topic_code"]
        # Only advance if task_id matches user's current topic_code
        if task_id == expected_topic_code:
            await db["user_progress"].update_one(
                {"user_id": user_id},
                {
                    "$push": {"completed_topics": task_id},
                },
                upsert=True,
            )

    return {"id": task_id, "completed": True}
