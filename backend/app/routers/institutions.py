from datetime import datetime, timedelta, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import get_db
from app.rewards import award_achievement_if_not_exists, issue_credential_if_not_exists
from app.models import (
    AssessmentCreateRequest,
    AssessmentSubmissionRequest,
    InstitutionAnalyticsResponse,
    InstitutionOptionResponse,
)

router = APIRouter(tags=["institutions"])

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["INSTITUTION_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

async def ensure_institution_id(db, user: dict) -> str:
    inst_id = user.get("institution_id")
    if not inst_id:
        inst_doc = {
            "name": f"Institution {str(user['_id'])[-6:]}",
            "created_by_admin_id": str(user["_id"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        inst_res = await db["institutions"].insert_one(inst_doc)
        inst_id = str(inst_res.inserted_id)
        await db["users"].update_one(
            {"_id": user["_id"]},
            {"$set": {"institution_id": inst_id}}
        )
        user["institution_id"] = inst_id
    return inst_id

@router.get("/list", response_model=List[InstitutionOptionResponse])
async def get_institutions_list():
    db = get_db()
    insts = await db["institutions"].find({}).to_list(500)
    return [
        InstitutionOptionResponse(id=str(i["_id"]), name=i.get("name", "Unnamed Institution"))
        for i in insts
    ]

@router.get("/analytics", response_model=InstitutionAnalyticsResponse)
async def get_analytics(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    total_students = await db["users"].count_documents({
        "institution_id": inst_id,
        "role": "STUDENT"
    })

    assessment_count = await db["assessments"].count_documents({
        "institution_id": inst_id
    })

    contest_count = await db["contest_sessions"].count_documents({
        "institution_id": inst_id
    })

    assessment_docs = await db["assessments"].find(
        {"institution_id": inst_id},
        {"_id": 1}
    ).to_list(2000)
    assessment_ids = [str(a["_id"]) for a in assessment_docs]

    total_submissions = await db["submissions"].count_documents({
        "assessment_id": {"$in": assessment_ids}
    })

    return InstitutionAnalyticsResponse(
        total_students=total_students,
        assessment_count=assessment_count,
        contest_count=contest_count,
        total_submissions=total_submissions,
    )

@router.get("/admin/assessments")
async def get_admin_assessments(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    assessments = await db["assessments"].find({"institution_id": inst_id}).sort("created_at", -1).to_list(500)
    return [
        {
            "id": str(a["_id"]),
            "title": a.get("title", ""),
            "start_time": a.get("start_time", ""),
            "end_time": a.get("end_time", ""),
            "created_at": a.get("created_at", "")
        }
        for a in assessments
    ]

@router.post("/assessments")
async def create_assessment(
    payload: AssessmentCreateRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    question_ids = []

    # Mode B: Bank-based random sampling
    if payload.year and payload.topic_code and payload.question_count and payload.question_count > 0:
        available_count = await db["quiz_bank"].count_documents({
            "year": payload.year,
            "topic_code": payload.topic_code,
        })

        if available_count < payload.question_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested question_count ({payload.question_count}) exceeds available questions ({available_count}) in quiz_bank for year '{payload.year}' and topic '{payload.topic_code}'",
            )

        pipeline = [
            {"$match": {"year": payload.year, "topic_code": payload.topic_code}},
            {"$sample": {"size": payload.question_count}},
        ]
        sampled_docs = await db["quiz_bank"].aggregate(pipeline).to_list(payload.question_count)
        question_ids = [doc["_id"] for doc in sampled_docs]

    # Mode A: Manual question creation
    elif payload.questions:
        for q in payload.questions:
            q_doc = {
                "year": payload.year or "1st Year",
                "topic_code": payload.topic_code or payload.skill.lower().replace(" ", "_"),
                "prompt": q.prompt,
                "options": q.options,
                "correct_option": q.correct_option,
            }
            res = await db["quiz_bank"].insert_one(q_doc)
            question_ids.append(res.inserted_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either provide questions (Mode A) or year, topic_code, and question_count (Mode B)",
        )

    now = datetime.now(timezone.utc)
    start_time = payload.start_time or now.isoformat()
    end_time = payload.end_time or (now + timedelta(hours=1)).isoformat()
    created_at = now.isoformat()

    assessment_doc = {
        "title": payload.title,
        "description": payload.description or "",
        "institution_id": inst_id,
        "skill": payload.skill,
        "year": payload.year,
        "topic_code": payload.topic_code,
        "question_ids": question_ids,
        "start_time": start_time,
        "end_time": end_time,
        "duration_minutes": payload.duration_minutes,
        "created_at": created_at,
    }

    res = await db["assessments"].insert_one(assessment_doc)

    return {
        "id": str(res.inserted_id),
        "title": assessment_doc["title"],
        "description": assessment_doc["description"],
        "institution_id": inst_id,
        "skill": assessment_doc["skill"],
        "question_ids": [str(qid) for qid in question_ids],
        "start_time": start_time,
        "end_time": end_time,
        "duration_minutes": payload.duration_minutes,
        "created_at": created_at,
    }

@router.get("/assessments")
async def get_assessments(
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_inst = current_user.get("institution_id")
    if not user_inst:
        return []

    now_dt = datetime.now(timezone.utc)

    # Fetch assessments assigned to this institution
    assessments_cursor = db["assessments"].find({"institution_id": user_inst})
    assessments_list = await assessments_cursor.to_list(100)

    result = []
    for a in assessments_list:
        # Check start_time <= now <= end_time
        try:
            st = datetime.fromisoformat(a["start_time"].replace("Z", "+00:00"))
            et = datetime.fromisoformat(a["end_time"].replace("Z", "+00:00"))
            if not (st <= now_dt <= et):
                continue
        except Exception:
            pass

        # Resolve questions from quiz_bank
        q_ids = a.get("question_ids", [])
        raw_questions = await db["quiz_bank"].find({"_id": {"$in": q_ids}}).to_list(len(q_ids))

        # Never include correct_option in student response
        resolved_questions = []
        for q in raw_questions:
            resolved_questions.append({
                "id": str(q["_id"]),
                "prompt": q["prompt"],
                "options": q["options"],
            })

        result.append({
            "id": str(a["_id"]),
            "title": a["title"],
            "description": a.get("description", ""),
            "skill": a.get("skill", ""),
            "duration_minutes": a.get("duration_minutes"),
            "end_time": a.get("end_time"),
            "questions": resolved_questions,
        })

    return result

@router.post("/assessments/{id}/start")
async def start_assessment_attempt(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id_str = str(current_user["_id"])
    try:
        a_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid assessment id")

    assessment = await db["assessments"].find_one({"_id": a_obj_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    user_inst = current_user.get("institution_id")
    if user_inst and assessment.get("institution_id") and user_inst != assessment.get("institution_id"):
        raise HTTPException(status_code=403, detail="Forbidden: Assessment does not belong to your institution")

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await db["assessment_attempts"].find_one({"assessment_id": id, "user_id": user_id_str})
    if not existing:
        await db["assessment_attempts"].insert_one({
            "assessment_id": id,
            "user_id": user_id_str,
            "start_time": now_iso,
        })
        start_time_res = now_iso
    else:
        start_time_res = existing["start_time"]

    return {
        "status": "started",
        "start_time": start_time_res,
        "duration_minutes": assessment.get("duration_minutes"),
    }

@router.post("/assessments/{id}/submissions")
async def submit_assessment(
    id: str,
    payload: AssessmentSubmissionRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    try:
        assessment_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid assessment id",
        )

    assessment = await db["assessments"].find_one({"_id": assessment_obj_id})
    if not assessment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assessment not found",
        )

    user_inst = current_user.get("institution_id")
    if user_inst and assessment.get("institution_id") and user_inst != assessment.get("institution_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Assessment does not belong to your institution",
        )

    # Window & Duration enforcement
    now_dt = datetime.now(timezone.utc)
    st = datetime.fromisoformat(assessment["start_time"].replace("Z", "+00:00"))
    et = datetime.fromisoformat(assessment["end_time"].replace("Z", "+00:00"))

    if now_dt > et:
        raise HTTPException(status_code=400, detail="Assessment time window has closed")
    if now_dt < st:
        raise HTTPException(status_code=400, detail="Assessment has not opened yet")

    user_id_str = str(current_user["_id"])
    duration_min = assessment.get("duration_minutes")
    if duration_min:
        attempt = await db["assessment_attempts"].find_one({"assessment_id": id, "user_id": user_id_str})
        if attempt:
            att_start = datetime.fromisoformat(attempt["start_time"].replace("Z", "+00:00"))
            if now_dt > (att_start + timedelta(minutes=duration_min)):
                raise HTTPException(status_code=400, detail="Assessment time limit for your attempt has expired")
        else:
            await db["assessment_attempts"].insert_one({
                "assessment_id": id,
                "user_id": user_id_str,
                "start_time": now_dt.isoformat(),
            })

    q_ids = assessment.get("question_ids", [])
    questions = await db["quiz_bank"].find({"_id": {"$in": q_ids}}).to_list(len(q_ids))

    total_questions = len(questions)
    if total_questions == 0:
        score = 0.0
    else:
        correct_count = 0
        for q in questions:
            qid_str = str(q["_id"])
            if qid_str in payload.answers:
                if payload.answers[qid_str] == q.get("correct_option"):
                    correct_count += 1
        score = (correct_count / total_questions) * 100.0

    submission_doc = {
        "assessment_id": id,
        "user_id": user_id_str,
        "answers": payload.answers,
        "score": round(score, 1),
        "submitted_at": now_dt.isoformat(),
    }

    await db["submissions"].insert_one(submission_doc)

    if score >= 90.0:
        await award_achievement_if_not_exists(db, user_id_str, "quiz_ace")
        await issue_credential_if_not_exists(
            db,
            user_id_str,
            "assessment_score",
            f"Assessment Ace: {assessment.get('title', 'Assessment')}",
            {"assessment_title": assessment.get("title", "Assessment"), "score": round(score, 1)}
        )

    return {"score": round(score, 1)}

@router.get("/assessments/{id}/results")
async def get_assessment_results(
    id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    try:
        a_obj_id = ObjectId(id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid assessment ID")

    assessment = await db["assessments"].find_one({"_id": a_obj_id})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    if assessment.get("institution_id") != inst_id:
        raise HTTPException(status_code=403, detail="Forbidden: Assessment does not belong to your institution")

    total_assigned = await db["users"].count_documents({
        "institution_id": inst_id,
        "role": "STUDENT"
    })

    submissions = await db["submissions"].find({"assessment_id": id}).to_list(500)
    user_ids = [ObjectId(s["user_id"]) for s in submissions if ObjectId.is_valid(s.get("user_id", ""))]
    users = await db["users"].find({"_id": {"$in": user_ids}}).to_list(len(user_ids))
    users_map = {str(u["_id"]): u.get("name", "Student") for u in users}

    attempts = await db["assessment_attempts"].find({"assessment_id": id}).to_list(500)
    attempts_map = {att["user_id"]: att.get("start_time") for att in attempts}

    results_list = []
    for sub in submissions:
        uid = sub.get("user_id")
        sub_time = sub.get("submitted_at")
        start_time = attempts_map.get(uid) or sub_time

        time_taken_sec = 0
        if sub_time and start_time:
            try:
                st = datetime.fromisoformat(start_time.replace("Z", "+00:00"))
                et = datetime.fromisoformat(sub_time.replace("Z", "+00:00"))
                time_taken_sec = max(0, int((et - st).total_seconds()))
            except Exception:
                pass

        results_list.append({
            "student_name": users_map.get(uid, "Student"),
            "score": sub.get("score", 0),
            "submitted_at": sub_time,
            "time_taken_seconds": time_taken_sec
        })

    results_list.sort(key=lambda x: (-x["score"], x["time_taken_seconds"]))
    for rank, item in enumerate(results_list, start=1):
        item["rank"] = rank

    return {
        "title": assessment.get("title", ""),
        "total_assigned": total_assigned,
        "total_attempted": len(results_list),
        "leaderboard": results_list
    }
