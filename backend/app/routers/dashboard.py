from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.db import get_db
from app.routers.recommendation import get_user_recommendations

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", status_code=status.HTTP_200_OK)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id})

    goal = (progress.get("goal") if progress else None) or current_user.get("goal") or "software_engineering"
    year = (progress.get("year") if progress else None) or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    current_topic_index = progress.get("current_topic_index", 0) if progress else 0
    completed_topics = progress.get("completed_topics", []) if progress else []

    total_topics = len(sequence)
    progress_percent = round((len(completed_topics) / total_topics) * 100) if total_topics > 0 else 0

    plan_label = curriculum.get("plan_label", "") if curriculum else ""
    phases_list = []
    for item in sequence:
        p = item.get("phase")
        if p and p not in phases_list:
            phases_list.append(p)

    if sequence and current_topic_index < total_topics:
        current_topic_item = sequence[current_topic_index]
        current_topic_label = current_topic_item["label"]
        current_topic_code = current_topic_item["topic_code"]
        current_phase = current_topic_item.get("phase", "")
        current_dimension = current_topic_item.get("dimension", "")
        current_priority = current_topic_item.get("priority", "")
        is_completed = False
    else:
        current_topic_label = "Completed"
        current_topic_code = "completed"
        current_phase = "Completed"
        current_dimension = ""
        current_priority = ""
        is_completed = True

    total_phases = len(phases_list) if phases_list else 1
    phase_step = (phases_list.index(current_phase) + 1) if current_phase in phases_list else 1

    # Pull recommendations for dashboard preview
    rec_data = await get_user_recommendations(current_user, db)
    resources = rec_data.get("resources", [])

    return {
        "current_topic": current_topic_label,
        "progress_percent": progress_percent,
        "streak": current_user.get("streak", 0) or 0,
        "goal": goal,
        "year": year,
        "plan_label": plan_label,
        "phase": current_phase,
        "dimension": current_dimension,
        "priority": current_priority,
        "phase_info": {
            "current_phase": current_phase,
            "plan_label": plan_label,
            "phase_step": phase_step,
            "total_phases": total_phases,
            "display": f"Phase {phase_step} of {total_phases}: {current_phase.replace('Phase ' + str(phase_step) + ': ', '')}" if not is_completed else "Completed",
        },
        # Integrated fields for AppContext.tsx and Dashboard.tsx
        "identity_twin": {
            "target_role": current_user.get("target_role") or goal,
            "goal": goal,
            "identity_score": 85,
            "identity_drift_percentage": 12,
        },
        "analytics": {
            "growth_score": 88,
            "weekly_hours_logged": 14,
            "burnout_risk_score": 15,
            "streak_days": current_user.get("streak", 0) or 0,
        },
        "roadmap": {
            "tasks": [
                {
                    "id": current_topic_code,
                    "title": current_topic_label,
                    "completed": False,
                    "duration_mins": 45,
                    "priority": current_priority.lower() if current_priority else "high",
                    "category": current_dimension.replace("_", " ").title() if current_dimension else "Curriculum",
                }
            ] if not is_completed else []
        },
        "recommendations": resources[:4],
    }
