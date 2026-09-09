from typing import Any, Dict, List, Optional
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


@router.get("/verify", status_code=status.HTTP_200_OK)
async def verify_curriculum() -> Dict[str, Any]:
    """
    Verification endpoint: checks all 40 curriculum docs exist with non-empty sequences,
    and that every unique topic_code across all curricula has a matching resource doc.
    Returns a structured pass/fail report.
    """
    db = get_db()

    EXPECTED_GOALS = [
        "software_engineering", "aiml_engineering", "data_engineering", "cybersecurity",
        "cloud_devops_sre", "data_science", "data_analytics_bi", "embedded_systems",
        "qa_automation", "frontend_fullstack",
    ]
    EXPECTED_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"]

    total_expected = len(EXPECTED_GOALS) * len(EXPECTED_YEARS)  # 40
    missing_curricula: List[str] = []
    empty_sequences: List[str] = []
    all_topic_codes: set = set()

    # Check all 40 curricula
    for goal in EXPECTED_GOALS:
        for year in EXPECTED_YEARS:
            doc = await db["curriculum"].find_one({"goal": goal, "year": year})
            key = f"{goal} / {year}"
            if not doc:
                missing_curricula.append(key)
            else:
                seq = doc.get("sequence", [])
                if not seq:
                    empty_sequences.append(key)
                else:
                    for item in seq:
                        tc = item.get("topic_code")
                        if tc:
                            all_topic_codes.add(tc)

    # Check every topic_code has a resource doc
    missing_resources: List[str] = []
    for tc in sorted(all_topic_codes):
        res = await db["resources"].find_one({"topic_code": tc})
        if not res:
            missing_resources.append(tc)

    total_curricula = await db["curriculum"].count_documents({})
    total_resources = await db["resources"].count_documents({})

    passed = (
        len(missing_curricula) == 0
        and len(empty_sequences) == 0
        and len(missing_resources) == 0
        and total_curricula >= total_expected
    )

    return {
        "passed": passed,
        "summary": {
            "total_curricula_in_db": total_curricula,
            "expected_curricula": total_expected,
            "total_resources_in_db": total_resources,
            "unique_topic_codes_found": len(all_topic_codes),
        },
        "issues": {
            "missing_curricula": missing_curricula,
            "empty_sequences": empty_sequences,
            "topic_codes_missing_resources": missing_resources,
        },
    }
