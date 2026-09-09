import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.services.youtube_search import search_videos

logger = logging.getLogger("growthos.learning")

router = APIRouter(prefix="/learning", tags=["learning"])

VIDEO_CACHE: Dict[str, List[dict]] = {}

@router.get("/videos", status_code=status.HTTP_200_OK)
async def get_learning_videos(
    topic_code: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    effective_topic = (topic_code or "dsa").strip()
    cache_key = f"{effective_topic.lower()}:{(query or '').strip().lower()}"

    if cache_key in VIDEO_CACHE and VIDEO_CACHE[cache_key]:
        return {"videos": VIDEO_CACHE[cache_key]}

    search_term = ""
    if query and query.strip():
        search_term = query.strip()
    else:
        label = None
        # Try looking up topic label in curriculum docs
        try:
            curr_doc = await db["curriculum"].find_one({"sequence.topic_code": effective_topic})
            if curr_doc:
                for item in curr_doc.get("sequence", []):
                    if item.get("topic_code") == effective_topic:
                        label = item.get("label")
                        break
        except Exception:
            pass

        if not label:
            label = effective_topic.replace("_", " ").title()

        search_term = f"{label} for beginners"

    logger.info(f"Fetching YouTube videos for topic '{effective_topic}' with search term '{search_term}'")
    try:
        videos = await search_videos(search_term, max_results=6, timeout_sec=22.0)
    except Exception as exc:
        logger.warning(f"YouTube search failed gracefully: {exc}")
        videos = []

    if videos:
        VIDEO_CACHE[cache_key] = videos

    return {"videos": videos}
