import asyncio
import logging
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Query, status

from app.auth import get_current_user
from app.db import get_db
from app.routers.learning import _resolve_topic_label
from app.services.opportunity_search import (
    search_open_source_issues,
    search_jobs_remotive,
    search_jobs_arbeitnow,
    search_hackathons,
    search_conferences,
    search_mentorship,
)

logger = logging.getLogger("growthos.opportunity")

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

LIVE_OPPORTUNITY_CACHE: Dict[str, List[dict]] = {}

@router.get("/live", status_code=status.HTTP_200_OK)
async def get_live_opportunities(
    topic_code: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    effective_topic = (topic_code if isinstance(topic_code, str) and topic_code else "dsa").strip()
    cache_key = effective_topic.lower()

    if cache_key in LIVE_OPPORTUNITY_CACHE and LIVE_OPPORTUNITY_CACHE[cache_key]:
        return {"opportunities": LIVE_OPPORTUNITY_CACHE[cache_key]}

    label = await _resolve_topic_label(db, effective_topic)
    logger.info(f"Fetching live opportunities for topic '{effective_topic}' (label: '{label}')")

    t1 = asyncio.to_thread(search_open_source_issues, label, 6)
    t2 = asyncio.to_thread(search_jobs_remotive, label, 6)
    t3 = asyncio.to_thread(search_jobs_arbeitnow, label, 6)
    t4 = asyncio.to_thread(search_hackathons, label, 6)
    t5 = asyncio.to_thread(search_conferences, label, 6)
    t6 = asyncio.to_thread(search_mentorship, label, 6)

    res1, res2, res3, res4, res5, res6 = await asyncio.gather(
        t1, t2, t3, t4, t5, t6,
        return_exceptions=True
    )

    merged: List[dict] = []
    seen_urls = set()

    for res in [res1, res2, res3, res4, res5, res6]:
        if isinstance(res, list):
            for item in res:
                if isinstance(item, dict) and item.get("url"):
                    u = item["url"]
                    if u not in seen_urls:
                        seen_urls.add(u)
                        merged.append(item)

    if merged:
        LIVE_OPPORTUNITY_CACHE[cache_key] = merged

    return {"opportunities": merged}
