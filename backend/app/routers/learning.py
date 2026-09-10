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

@router.get("/resources/live", status_code=status.HTTP_200_OK)
async def get_live_learning_resources(
    topic_code: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    effective_topic = (topic_code or "dsa").strip()
    cache_key = effective_topic.lower()

    if cache_key in LIVE_RESOURCE_CACHE and LIVE_RESOURCE_CACHE[cache_key]:
        return LIVE_RESOURCE_CACHE[cache_key]

    label = None
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
