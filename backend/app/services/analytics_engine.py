from typing import Dict, List, Any
from app.db import get_db
from app.curriculum_utils import get_current_topic

async def get_identity_score(user_id: str, db=None) -> int:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    goal = progress.get("goal") or user.get("goal") or "software_engineering"
    year = progress.get("year") or user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_topics = progress.get("completed_topics", []) or []

    if not sequence:
        return 0

    completion_ratio = len(completed_topics) / len(sequence)
    return min(100, round(completion_ratio * 100))


async def get_growth_score(user_id: str, db=None) -> int:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    identity_score = await get_identity_score(user_id_str, db)
    completion_component = (identity_score / 100.0) * 40.0

    subs = await db["submissions"].find({"user_id": user_id_str}).to_list(500)
    if subs:
        avg_quiz_score = sum(float(s.get("score", 0)) for s in subs) / len(subs)
    else:
        avg_quiz_score = 0.0
    quiz_component = (avg_quiz_score / 100.0) * 30.0

    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    streak = user.get("current_streak") or user.get("streak") or 0
    streak_component = min(streak, 10) * 3.0

    total_score = round(completion_component + quiz_component + streak_component)
    return min(100, max(0, total_score))


async def get_burnout_risk(user_id: str, db=None) -> dict:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    streak = user.get("current_streak") or user.get("streak") or 0

    if streak >= 7:
        return {"risk_pct": 75, "label": "High"}
    elif streak >= 2:
        return {"risk_pct": 20, "label": "Optimal (Low)"}
    else:
        return {"risk_pct": 10, "label": "Low Engagement"}


async def get_deep_learning_hours(user_id: str, db=None) -> float:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    completed_topics = progress.get("completed_topics", []) or []
    hours = len(completed_topics) * 2.0
    return round(hours, 1)


async def get_dimension_mastery(user_id: str, db=None) -> List[Dict[str, Any]]:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    goal = progress.get("goal") or user.get("goal") or "software_engineering"
    year = progress.get("year") or user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_set = set(progress.get("completed_topics", []) or [])

    dim_stats: Dict[str, Dict[str, int]] = {}
    for item in sequence:
        dim = item.get("dimension") or "General Skills"
        dim_label = dim.replace("_", " ").title()
        if dim_label not in dim_stats:
            dim_stats[dim_label] = {"completed": 0, "total": 0}
        dim_stats[dim_label]["total"] += 1
        if item.get("topic_code") in completed_set:
            dim_stats[dim_label]["completed"] += 1

    result = []
    for dim_label, stats in dim_stats.items():
        mastery_pct = round((stats["completed"] / stats["total"]) * 100) if stats["total"] > 0 else 0
        result.append({
            "dimension": dim_label,
            "mastery_pct": mastery_pct,
            "completed": stats["completed"],
            "total": stats["total"],
        })
    return result


async def get_active_focus(user_id: str, db=None) -> dict:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    goal = progress.get("goal") or user.get("goal") or "software_engineering"
    year = progress.get("year") or user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_topics = progress.get("completed_topics", []) or []

    current_topic = get_current_topic(sequence, completed_topics)

    if current_topic:
        dim = (current_topic.get("dimension") or "General").replace("_", " ").title()
        lbl = current_topic.get("label") or current_topic.get("title") or "Current Topic"
        prio = current_topic.get("priority", "P1")
        target_mastery = 100 if prio == "P0" else 80
        return {
            "dimension": dim,
            "label": lbl,
            "target_mastery": target_mastery,
        }
    else:
        return {
            "dimension": "Curriculum Mastery",
            "label": "All Topics Completed",
            "target_mastery": 100,
        }


async def get_key_skill_strengths(user_id: str, db=None) -> List[str]:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    goal = progress.get("goal") or user.get("goal") or "software_engineering"
    year = progress.get("year") or user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_set = set(progress.get("completed_topics", []) or [])

    strengths = []
    for item in sequence:
        if item.get("topic_code") in completed_set:
            lbl = item.get("label") or item.get("title") or item.get("topic_code")
            if lbl not in strengths:
                strengths.append(lbl)
    return strengths


async def get_required_target_mastery(user_id: str, db=None) -> List[str]:
    if db is None:
        db = get_db()
    
    user_id_str = str(user_id)
    progress = await db["user_progress"].find_one({"user_id": user_id_str}) or {}
    user = await db["users"].find_one({"_id": user_id}) or {}
    if not user and len(user_id_str) == 24:
        from bson import ObjectId
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id_str)}) or {}
        except Exception:
            pass

    goal = progress.get("goal") or user.get("goal") or "software_engineering"
    year = progress.get("year") or user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_set = set(progress.get("completed_topics", []) or [])

    p0_remaining = []
    all_remaining = []
    for item in sequence:
        tcode = item.get("topic_code")
        if tcode not in completed_set:
            lbl = item.get("label") or item.get("title") or tcode
            all_remaining.append(lbl)
            if item.get("priority") == "P0":
                p0_remaining.append(lbl)

    return p0_remaining if p0_remaining else all_remaining
