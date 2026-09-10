from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.curriculum_utils import get_current_topic
from app.db import get_db
from app.models import TaskUpdateRequest, TopicCheckSubmissionRequest

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

@router.get("/tasks/{topic_code}/check", status_code=status.HTTP_200_OK)
async def get_topic_check(
    topic_code: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    questions = await db["topic_checks"].find({"topic_code": topic_code}).to_list(100)

    if not questions:
        return {"available": False}

    import random
    if len(questions) > 10:
        questions = random.sample(questions, 10)

    resolved_questions = []
    for q in questions:
        resolved_questions.append({
            "id": str(q["_id"]),
            "prompt": q["prompt"],
            "options": q["options"],
        })

    return {
        "available": True,
        "topic_code": topic_code,
        "questions": resolved_questions,
    }

@router.post("/tasks/{topic_code}/check/submit", status_code=status.HTTP_200_OK)
async def submit_topic_check(
    topic_code: str,
    payload: TopicCheckSubmissionRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])

    questions = await db["topic_checks"].find({"topic_code": topic_code}).to_list(100)
    if not questions:
        await update_planner_task(topic_code, TaskUpdateRequest(completed=True), current_user)
        return {"passed": True, "score": 100, "message": "No topic check configured — auto marked as complete."}

    total_questions = min(10, len(questions))
    correct_count = 0
    questions_map = {str(q["_id"]): q for q in questions}

    if payload and payload.answers:
        for qid, chosen_option in payload.answers.items():
            if qid in questions_map:
                if chosen_option == questions_map[qid].get("correct_option"):
                    correct_count += 1

    score_pct = round((correct_count / total_questions) * 100) if total_questions > 0 else 0
    passed = score_pct >= 80

    now_iso = datetime.now(timezone.utc).isoformat()
    await db["topic_check_attempts"].insert_one({
        "user_id": user_id,
        "topic_code": topic_code,
        "score_pct": score_pct,
        "passed": passed,
        "attempted_at": now_iso
    })

    topic_label = topic_code.replace("_", " ").title()

    if passed:
        await update_planner_task(topic_code, TaskUpdateRequest(completed=True), current_user)
        return {
            "passed": True,
            "score": score_pct,
            "message": f"Awesome job! You scored {score_pct}% and mastered {topic_label}."
        }
    else:
        return {
            "passed": False,
            "score": score_pct,
            "message": f"You scored {score_pct}%. You need 80% to mark this complete — review {topic_label} and try again."
        }
