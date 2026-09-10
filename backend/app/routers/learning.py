import asyncio
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.services.youtube_search import search_videos
from app.services.article_search import search_articles
from app.services.book_search import search_books, search_papers

logger = logging.getLogger("growthos.learning")

router = APIRouter(prefix="/learning", tags=["learning"])

VIDEO_CACHE: Dict[str, List[dict]] = {}
LIVE_RESOURCE_CACHE: Dict[str, dict] = {}

async def _resolve_topic_label(db, effective_topic: str) -> str:
    if " " in effective_topic or any(c.isupper() for c in effective_topic):
        return effective_topic

    try:
        curr_doc = await db["curriculum"].find_one({"sequence.topic_code": effective_topic})
        if curr_doc:
            for item in curr_doc.get("sequence", []):
                if item.get("topic_code") == effective_topic and item.get("label"):
                    return item.get("label")
    except Exception:
        pass

    return effective_topic.replace("_", " ").title()

def _rank_videos(videos: List[dict], label: str, topic_code: str) -> List[dict]:
    if not videos:
        return []

    label_lower = label.lower()
    stop_words = {"and", "for", "with", "the", "in", "of", "to", "a", "an", "learning", "guide", "tutorial", "course", "full", "lecture"}
    raw_words = label_lower.replace("&", " ").replace("-", " ").replace("_", " ").split()
    keywords = [w for w in raw_words if len(w) > 2 and w not in stop_words]
    code_words = [w for w in topic_code.lower().split("_") if len(w) > 2 and w not in stop_words]
    keywords = list(set(keywords + code_words))

    def score(v: dict) -> int:
        title = (v.get("title") or "").lower()
        s = 0
        if label_lower in title:
            s += 10
        for kw in keywords:
            if kw in title:
                s += 3
        generic_noise = ["java in 14 minutes", "python for beginners", "learn c++", "javascript tutorial", "html css"]
        if any(g in title for g in generic_noise) and not any(kw in label_lower for kw in ["java", "python", "c++", "javascript", "html"]):
            s -= 8
        return s

    ranked = sorted(videos, key=score, reverse=True)
    return ranked[:6]

@router.get("/videos", status_code=status.HTTP_200_OK)
async def get_learning_videos(
    topic_code: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    effective_topic = (topic_code if isinstance(topic_code, str) and topic_code else "dsa").strip()
    query_str = query if isinstance(query, str) else ""
    cache_key = f"{effective_topic.lower()}:{query_str.strip().lower()}"

    if cache_key in VIDEO_CACHE and VIDEO_CACHE[cache_key]:
        return {"videos": VIDEO_CACHE[cache_key]}

    search_term = ""
    if query_str and query_str.strip():
        search_term = query_str.strip()
        label = search_term
    else:
        label = await _resolve_topic_label(db, effective_topic)
        search_term = f"{label} full course"

    logger.info(f"Fetching YouTube videos for topic '{effective_topic}' with search term '{search_term}'")
    try:
        candidate_videos = await search_videos(search_term, max_results=10, timeout_sec=25.0)
        videos = _rank_videos(candidate_videos, label, effective_topic)
    except Exception as exc:
        logger.warning(f"YouTube search failed gracefully: {exc}")
        videos = []

    if videos:
        VIDEO_CACHE[cache_key] = videos

    return {"videos": videos}

@router.get("/resources/live", status_code=status.HTTP_200_OK)
async def get_live_learning_resources(
    topic_code: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    effective_topic = (topic_code if isinstance(topic_code, str) and topic_code else "dsa").strip()
    cache_key = effective_topic.lower()

    if cache_key in LIVE_RESOURCE_CACHE and LIVE_RESOURCE_CACHE[cache_key]:
        return LIVE_RESOURCE_CACHE[cache_key]

    label = await _resolve_topic_label(db, effective_topic)

    logger.info(f"Fetching live articles, books, and papers for topic '{effective_topic}' (label: '{label}')")

    articles_task = search_articles(label, max_results=6)
    books_task = asyncio.to_thread(search_books, label, 6)
    papers_task = asyncio.to_thread(search_papers, label, 6)

    articles, books, papers = await asyncio.gather(
        articles_task,
        books_task,
        papers_task,
        return_exceptions=True
    )

    articles_list = articles if isinstance(articles, list) else []
    books_list = books if isinstance(books, list) else []
    papers_list = papers if isinstance(papers, list) else []

    result = {
        "articles": articles_list,
        "books": books_list,
        "papers": papers_list,
    }

    if articles_list or books_list or papers_list:
        LIVE_RESOURCE_CACHE[cache_key] = result

    return result
