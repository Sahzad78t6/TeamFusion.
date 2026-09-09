from bson import ObjectId
from fastapi import APIRouter, Depends, status

from app.auth import get_current_user, to_user_response
from app.db import get_db
from app.models import IdentityResponse, OnboardingRequest, UserResponse

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def submit_onboarding(
    payload: OnboardingRequest,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = current_user["_id"]

    inst_name = ""
    inst_id = payload.institution_id
    if inst_id:
        try:
            inst_doc = await db["institutions"].find_one({"_id": ObjectId(inst_id)})
            if inst_doc:
                inst_name = inst_doc.get("name", "")
        except Exception:
            pass

    college_val = inst_name or (payload.skills[0] if payload.skills and len(payload.skills) > 0 else "")

    update_fields = {
        "goal": payload.goal,
        "year": payload.current_role,
        "college": college_val,
        "institution_name": college_val,
        "institution_id": inst_id,
        "onboarding_completed": True,
    }

    await db["users"].update_one(
        {"_id": user_id},
        {"$set": update_fields}
    )

    # Fetch curriculum sequence to validate known_topics
    goal_val = payload.goal or "software_engineering"
    year_val = payload.current_role or "1st Year"
    curriculum = await db["curriculum"].find_one({"goal": goal_val, "year": year_val})
    if not curriculum:
        curriculum = await db["curriculum"].find_one({"goal": "software_engineering", "year": "1st Year"})
    sequence = curriculum.get("sequence", []) if curriculum else []
    valid_topic_codes = {item["topic_code"] for item in sequence if "topic_code" in item}

    raw_known = payload.known_topics or []
    filtered_known = [code for code in raw_known if code in valid_topic_codes]

    # Upsert user_progress doc - seed completed_topics and skipped_topics from filtered known_topics
    await db["user_progress"].update_one(
        {"user_id": str(user_id)},
        {
            "$set": {
                "goal": goal_val,
                "year": year_val,
                "completed_topics": filtered_known,
                "skipped_topics": filtered_known,
            },
            "$unset": {
                "current_topic_index": ""
            }
        },
        upsert=True
    )

    updated_user = await db["users"].find_one({"_id": user_id})
    return to_user_response(updated_user)

@router.get("/identity", response_model=IdentityResponse, status_code=status.HTTP_200_OK)
async def get_identity(current_user: dict = Depends(get_current_user)):
    user_goal = current_user.get("goal")
    return IdentityResponse(
        goal=user_goal,
        year=current_user.get("year"),
        college=current_user.get("college"),
        target_role=user_goal,
    )
