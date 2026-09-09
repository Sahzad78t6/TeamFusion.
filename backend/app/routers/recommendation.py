from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user
from app.curriculum_utils import get_current_topic
from app.db import get_db
from app.models import RefreshRequest

router = APIRouter(prefix="/recommendation", tags=["recommendation"])

async def get_user_recommendations(current_user: dict, db) -> dict:
    user_id = str(current_user["_id"])
    progress = await db["user_progress"].find_one({"user_id": user_id})

    goal = (progress.get("goal") if progress else None) or current_user.get("goal") or "software_engineering"
    year = (progress.get("year") if progress else None) or current_user.get("year") or "1st Year"

    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        # Fallback to default Software Engineering 1st Year track
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    completed_topics = progress.get("completed_topics", []) if progress else []
    current_topic = get_current_topic(sequence, completed_topics)

    target_role = current_user.get("target_role") or current_user.get("goal") or "ML / AI Engineer"
    learning_style = current_user.get("learning_style") or "Practical & Visual"
    now_iso = datetime.now(timezone.utc).isoformat()

    if not sequence or not current_topic:
        return {
            "resources": [],
            "recommendations": [],
            "completed": True,
            "current_topic": None,
            "topic_code": None,
            "target_role": target_role,
            "primary_gap": "All Topics Completed",
            "learning_style": learning_style,
            "generated_at": now_iso,
        }

    topic_code = current_topic["topic_code"]
    topic_label = current_topic["label"]

    res_doc = await db["resources"].find_one({"topic_code": topic_code}) or {}

    flattened = []
    # Videos
    for idx, v in enumerate(res_doc.get("videos", [])):
        flattened.append({
            "id": f"{topic_code}-vid-{idx}",
            "title": v.get("title", ""),
            "type": "video",
            "author": "GrowthOS AI Curator",
            "platform": "YouTube",
            "duration": "45 Mins",
            "difficulty": "Beginner",
            "category": topic_label,
            "rating": 4.8,
            "tags": [topic_code],
            "imageUrl": v.get("thumbnail") or "https://images.unsplash.com/photo-1516116211223-48a122638e59?auto=format&fit=crop&w=800&q=80",
            "link": v.get("url") or "#",
            "isBookmarked": False,
            "isLiked": False,
            "progressPercentage": 0,
        })
    # PDFs
    for idx, p in enumerate(res_doc.get("pdfs", [])):
        flattened.append({
            "id": f"{topic_code}-pdf-{idx}",
            "title": p.get("title", ""),
            "type": "article",
            "author": "Technical Documentation",
            "platform": "Web / Reference",
            "duration": "25 Mins Read",
            "difficulty": "Beginner",
            "category": topic_label,
            "rating": 4.7,
            "tags": [topic_code],
            "imageUrl": "https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=800&q=80",
            "link": p.get("url") or "#",
            "isBookmarked": False,
            "isLiked": False,
            "progressPercentage": 0,
        })
    # Books
    for idx, b in enumerate(res_doc.get("books", [])):
        flattened.append({
            "id": f"{topic_code}-book-{idx}",
            "title": b.get("title", ""),
            "type": "book",
            "author": b.get("author", "Author"),
            "platform": "Open Textbook / Publisher",
            "duration": "Comprehensive",
            "difficulty": "Beginner",
            "category": topic_label,
            "rating": 4.9,
            "tags": [topic_code],
            "imageUrl": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
            "link": b.get("link") or "#",
            "isBookmarked": False,
            "isLiked": False,
            "progressPercentage": 0,
        })
    # Opportunities
    for idx, o in enumerate(res_doc.get("opportunities", [])):
        flattened.append({
            "id": f"{topic_code}-opp-{idx}",
            "title": o.get("title", ""),
            "type": "project",
            "author": "Hands-on Practice",
            "platform": "Competitive / Open Source",
            "duration": "Ongoing",
            "difficulty": "Beginner",
            "category": topic_label,
            "rating": 4.6,
            "tags": [topic_code],
            "imageUrl": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
            "link": o.get("link") or "#",
            "isBookmarked": False,
            "isLiked": False,
            "progressPercentage": 0,
        })

    return {
        "resources": flattened,
        "recommendations": flattened,
        "completed": False,
        "current_topic": topic_label,
        "topic_code": topic_code,
        "dimension": current_topic.get("dimension"),
        "priority": current_topic.get("priority"),
        "phase": current_topic.get("phase"),
        "plan_label": curriculum.get("plan_label") if curriculum else "",
        "target_role": target_role,
        "primary_gap": topic_label,
        "learning_style": learning_style,
        "generated_at": now_iso,
    }

@router.get("", status_code=status.HTTP_200_OK)
async def get_recommendation(
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    return await get_user_recommendations(current_user, db)

@router.post("/refresh", status_code=status.HTTP_200_OK)
async def refresh_recommendation(
    payload: Optional[RefreshRequest] = None,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    return await get_user_recommendations(current_user, db)
