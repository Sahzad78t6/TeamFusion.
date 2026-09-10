from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.curriculum_utils import get_current_topic
from app.db import get_db
from app.routers.recommendation import get_user_recommendations
from app.services.analytics_engine import (
    get_identity_score,
    get_growth_score,
    get_burnout_risk,
    get_deep_learning_hours,
    get_dimension_mastery,
    get_active_focus,
    get_key_skill_strengths,
    get_required_target_mastery,
)

router = APIRouter(tags=["dashboard"])

async def compute_user_analytics(db, current_user: dict, progress: dict = None, sequence: list = None) -> dict:
    user_id = str(current_user["_id"])
    if not progress:
        progress = await db["user_progress"].find_one({"user_id": user_id}) or {}

    completed_topics = set(progress.get("completed_topics", []))

    cat_map = {}
    if sequence:
        for item in sequence:
            dim = item.get("dimension") or "general_skills"
            dim_name = dim.replace("_", " ").title()
            if dim_name not in cat_map:
                cat_map[dim_name] = {"total": 0, "completed": 0}
            cat_map[dim_name]["total"] += 1
            if item.get("topic_code") in completed_topics:
                cat_map[dim_name]["completed"] += 1

    radar_skills = []
    if cat_map:
        for cat_name, stats in cat_map.items():
            curr = round((stats["completed"] / stats["total"]) * 100, 1) if stats["total"] > 0 else 0.0
            radar_skills.append({
                "subject": cat_name,
                "current": curr,
                "target": 80.0,
                "fullMark": 100,
            })
    else:
        default_categories = [
            "Data Structures",
            "System Architecture",
            "Backend APIs",
            "Cloud & DevOps",
            "Database Systems",
            "AI Integration",
        ]
        base_score = min(100.0, float(len(completed_topics) * 20))
        for cat in default_categories:
            radar_skills.append({
                "subject": cat,
                "current": base_score,
                "target": 80.0,
                "fullMark": 100,
            })

    now = datetime.now(timezone.utc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    reflections = await db["reflections"].find({"user_id": user_id}).to_list(100)
    daily_hours = {(now - timedelta(days=i)).strftime("%Y-%m-%d"): 0.0 for i in range(7)}

    for r in reflections:
        created = r.get("created_at")
        hours = float(r.get("study_hours", 0.0) or 0.0)
        if isinstance(created, datetime):
            date_str = created.strftime("%Y-%m-%d")
        elif isinstance(created, str) and len(created) >= 10:
            date_str = created[:10]
        else:
            date_str = ""

        if date_str in daily_hours:
            daily_hours[date_str] += hours

    past_7_days = [(now - timedelta(days=i)) for i in range(6, -1, -1)]
    weekly_heatmap = []
    total_hours = 0.0
    for d in past_7_days:
        d_str = d.strftime("%Y-%m-%d")
        day_label = day_names[d.weekday()]
        h_val = round(daily_hours.get(d_str, 0.0), 1)
        total_hours += h_val
        weekly_heatmap.append({
            "day": day_label,
            "hours": h_val,
        })

    streak = current_user.get("streak", 0) or current_user.get("current_streak", 0) or 0
    growth_score = await get_growth_score(user_id, db)
    deep_hours = await get_deep_learning_hours(user_id, db)
    burnout = await get_burnout_risk(user_id, db)

    return {
        "growth_score": growth_score,
        "weekly_hours_logged": deep_hours,
        "burnout_risk_score": burnout["risk_pct"],
        "burnout_label": burnout["label"],
        "streak_days": streak,
        "radar_skills": radar_skills,
        "weekly_heatmap": weekly_heatmap,
    }

@router.get("/dashboard", status_code=status.HTTP_200_OK)
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
    completed_topics = progress.get("completed_topics", []) if progress else []
    skipped_codes = progress.get("skipped_topics", []) if progress else []

    plan_label = curriculum.get("plan_label", "") if curriculum else ""
    phases_list = []
    for item in sequence:
        p = item.get("phase")
        if p and p not in phases_list:
            phases_list.append(p)

    current_topic_item = get_current_topic(sequence, completed_topics)

    if sequence and current_topic_item:
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

    topic_label_map = {item["topic_code"]: item["label"] for item in sequence if "topic_code" in item}
    skipped_topics_list = [
        {"topic_code": code, "label": topic_label_map.get(code, code)}
        for code in skipped_codes
    ]

    rec_data = await get_user_recommendations(current_user, db)
    resources = rec_data.get("resources", [])

    analytics_data = await compute_user_analytics(db, current_user, progress, sequence)

    # Real calculated metrics
    identity_score = await get_identity_score(user_id, db)
    growth_score = await get_growth_score(user_id, db)
    burnout = await get_burnout_risk(user_id, db)
    deep_learning_hours = await get_deep_learning_hours(user_id, db)
    drift_pct = 100 - identity_score

    return {
        "current_topic": current_topic_label,
        "progress_percent": identity_score,
        "identity_score": identity_score,
        "growth_score": growth_score,
        "burnout": burnout,
        "deep_learning_hours": deep_learning_hours,
        "streak": current_user.get("streak", 0) or current_user.get("current_streak", 0) or 0,
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
        "skipped_topics": skipped_topics_list,
        "today_tasks": {
            "completed": 0 if not is_completed else 1,
            "total": 1
        },
        "identity_twin": {
            "target_role": current_user.get("target_role") or goal,
            "goal": goal,
            "identity_score": identity_score,
            "identity_drift_percentage": drift_pct,
        },
        "analytics": analytics_data,
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

@router.get("/identity-twin", status_code=status.HTTP_200_OK)
async def get_identity_twin_endpoint(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id}) or {}

    identity_score = await get_identity_score(user_id, db)
    dimension_mastery = await get_dimension_mastery(user_id, db)
    active_focus = await get_active_focus(user_id, db)
    key_skill_strengths = await get_key_skill_strengths(user_id, db)
    required_target_mastery = await get_required_target_mastery(user_id, db)

    goal = progress.get("goal") or current_user.get("goal") or "software_engineering"
    target_role = progress.get("target_role") or current_user.get("target_role") or goal
    drift_pct = 100 - identity_score

    return {
        "identity_score": identity_score,
        "dimension_mastery": dimension_mastery,
        "active_focus": active_focus,
        "key_skill_strengths": key_skill_strengths,
        "required_target_mastery": required_target_mastery,
        "target_role": target_role,
        "goal": goal,
        "drift_pct": drift_pct,
    }

@router.get("/analytics", status_code=status.HTTP_200_OK)
async def get_analytics(current_user: dict = Depends(get_current_user)):
    db = get_db()
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id})
    goal = (progress.get("goal") if progress else None) or current_user.get("goal") or "software_engineering"
    year = (progress.get("year") if progress else None) or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    sequence = curriculum.get("sequence", []) if curriculum else []

    return await compute_user_analytics(db, current_user, progress, sequence)

