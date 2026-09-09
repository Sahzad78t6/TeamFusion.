from typing import List, Optional
from fastapi import APIRouter, status
from pydantic import BaseModel

from app.db import get_db

router = APIRouter(prefix="/curriculum", tags=["curriculum"])

class TopicItemResponse(BaseModel):
    topic_code: str
    label: str
    dimension: Optional[str] = None
    priority: Optional[str] = None
    phase: Optional[str] = None

@router.get("/topics", response_model=List[TopicItemResponse], status_code=status.HTTP_200_OK)
async def get_curriculum_topics(
    goal: str = "software_engineering",
    year: str = "1st Year",
):
    """
    Public lightweight endpoint returning the topic sequence for a specific (goal, year) curriculum track.
    Used by Onboarding Step 3 ('What do you already know?') to render prior-knowledge checkboxes.
    """
    db = get_db()
    curriculum = await db["curriculum"].find_one({"goal": goal, "year": year})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})

    sequence = curriculum.get("sequence", []) if curriculum else []
    return [
        TopicItemResponse(
            topic_code=item.get("topic_code", ""),
            label=item.get("label", ""),
            dimension=item.get("dimension"),
            priority=item.get("priority"),
            phase=item.get("phase"),
        )
        for item in sequence
    ]
