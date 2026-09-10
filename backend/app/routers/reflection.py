from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.auth import get_current_user
from app.db import get_db

router = APIRouter(prefix="/reflection", tags=["reflection"])

class ReflectionCreateRequest(BaseModel):
    mindset_state: Optional[str] = None
    entry_text: Optional[str] = None
    reflection: Optional[str] = None
    mood_score: Optional[int] = None
    energy_level: Optional[int] = None
    wins: Optional[str] = None
    challenges: Optional[str] = None
    study_hours: Optional[float] = 0.0

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/entries", status_code=status.HTTP_201_CREATED)
async def create_reflection_entry(
    payload: ReflectionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])
    now_iso = datetime.now(timezone.utc).isoformat()

    mindset_state = payload.mindset_state or "ecstatic"
    entry_text = payload.entry_text or payload.reflection or ""

    doc = {
        "user_id": user_id,
        "mindset_state": mindset_state,
        "entry_text": entry_text,
        "reflection": entry_text,
        "mood_score": payload.mood_score or 4,
        "created_at": now_iso,
    }

    res = await db["reflections"].insert_one(doc)
    doc_id = str(res.inserted_id)

    return {
        "id": doc_id,
        "_id": doc_id,
        "user_id": user_id,
        "mindset_state": mindset_state,
        "entry_text": entry_text,
        "reflection": entry_text,
        "mood_score": doc["mood_score"],
        "created_at": now_iso,
    }

@router.get("", status_code=status.HTTP_200_OK)
@router.get("/entries", status_code=status.HTTP_200_OK)
async def get_reflection_entries(
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = str(current_user["_id"])

    entries = await db["reflections"].find({"user_id": user_id}).sort("created_at", -1).to_list(500)

    result = []
    for e in entries:
        eid = str(e["_id"])
        result.append({
            "id": eid,
            "_id": eid,
            "user_id": user_id,
            "mindset_state": e.get("mindset_state") or "ecstatic",
            "entry_text": e.get("entry_text") or e.get("reflection") or "",
            "reflection": e.get("entry_text") or e.get("reflection") or "",
            "created_at": e.get("created_at") or "",
        })

    return result
