import re
from typing import List, Optional
from fastapi import APIRouter, Query, status
from pydantic import BaseModel
from app.db import get_db

router = APIRouter(prefix="/colleges", tags=["colleges"])

class CollegeSearchItem(BaseModel):
    college: str
    university: Optional[str] = ""
    state: Optional[str] = ""
    district: Optional[str] = ""

@router.get("/search", response_model=List[CollegeSearchItem], status_code=status.HTTP_200_OK)
async def search_colleges(
    q: str = Query("", min_length=0),
    limit: int = Query(8, ge=1, le=50)
):
    query_str = q.strip()
    if len(query_str) < 2:
        return []

    db = get_db()
    collection = db["colleges_reference"]

    q_norm = query_str.lower()

    # 1. Prefix match on normalized_college (fast indexed lookup)
    prefix_filter = {"normalized_college": {"$regex": f"^{re.escape(q_norm)}"}}
    prefix_cursor = collection.find(prefix_filter).limit(limit)
    prefix_docs = await prefix_cursor.to_list(length=limit)

    results = list(prefix_docs)

    # 2. Supplement with substring match if prefix results < limit
    remaining = limit - len(results)
    if remaining > 0:
        seen_ids = [doc["_id"] for doc in results]
        sub_filter = {
            "normalized_college": {"$regex": re.escape(q_norm)},
            "_id": {"$nin": seen_ids}
        }
        sub_cursor = collection.find(sub_filter).limit(remaining)
        sub_docs = await sub_cursor.to_list(length=remaining)
        results.extend(sub_docs)

    return [
        CollegeSearchItem(
            college=doc.get("college", ""),
            university=doc.get("university", ""),
            state=doc.get("state", ""),
            district=doc.get("district", ""),
        )
        for doc in results
    ]
