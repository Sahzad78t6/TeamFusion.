from datetime import date, datetime, timezone
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

    is_completed = payload.completed if payload and payload.completed is not None else True

    if is_completed:
        now_iso = datetime.now(timezone.utc).isoformat()
        await db["user_progress"].update_one(
            {"user_id": user_id},
            {
                "$addToSet": {"completed_topics": task_id},
                "$set": {f"completed_dates.{task_id}": now_iso}
            },
            upsert=True,
        )

        from app.rewards import award_achievement_if_not_exists, issue_credential_if_not_exists
        await award_achievement_if_not_exists(
            db, user_id, "first_topic_complete", "First Step", "Completed your first learning topic", "🎯"
        )

        # Check if all topics in curriculum sequence are completed
        updated_progress = await db["user_progress"].find_one({"user_id": user_id}) or {}
        new_completed = set(updated_progress.get("completed_topics", []))
        all_seq_codes = {item["topic_code"] for item in sequence if "topic_code" in item}

        if all_seq_codes and all_seq_codes.issubset(new_completed):
            await award_achievement_if_not_exists(
                db, user_id, "roadmap_complete", "Roadmap Master", "Completed all topics in your learning pathway", "🏆"
            )
            goal_label = goal.replace("_", " ").title()
            await issue_credential_if_not_exists(
                db, user_id, "roadmap_completion", f"{goal_label} Mastery Certificate", {"goal": goal, "year": year}
            )

        # Immediate Web Push Notification on task completion (fire and forget)
        from app.services.push import send_push
        completed_topic_label = task_id.replace("_", " ").title()
        next_topic = get_current_topic(sequence, list(new_completed))
        next_topic_label = next_topic.get("label") if next_topic else None
        send_push(
            user_id,
            title="Topic completed! 🎉",
            body=f"You finished {completed_topic_label}. Next up: {next_topic_label or 'you\'re done with this roadmap!'}",
            url="/dashboard"
        )
    else:
        await db["user_progress"].update_one(
            {"user_id": user_id},
            {"$pull": {"completed_topics": task_id}}
        )

    return {"id": task_id, "completed": is_completed}
