from datetime import datetime, timedelta, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import get_db
from app.models import (
    AssessmentCreateRequest,
    AssessmentSubmissionRequest,
    CohortCreateRequest,
    CohortResponse,
    InstitutionAnalyticsResponse,
    InstitutionOptionResponse,
    JoinCohortRequest,
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

    cohorts = await db["cohorts"].find({"institution_id": inst_id}, {"_id": 1}).to_list(1000)
    cohort_ids = [str(c["_id"]) for c in cohorts]
    cohort_count = len(cohorts)

    total_students = await db["users"].count_documents({
        "$or": [
            {"institution_id": inst_id, "role": "STUDENT"},
            {"cohort_id": {"$in": cohort_ids}},
        ]
    })

    assessment_docs = await db["assessments"].find(
        {"cohort_id": {"$in": cohort_ids}},
        {"_id": 1}
    ).to_list(2000)
    assessment_ids = [str(a["_id"]) for a in assessment_docs]

    assessment_submissions = await db["submissions"].count_documents({
        "assessment_id": {"$in": assessment_ids}
    })

    return InstitutionAnalyticsResponse(
        total_students=total_students,
        cohort_count=cohort_count,
        assessment_submissions=assessment_submissions,
    )

@router.get("/cohorts", response_model=List[CohortResponse])
async def get_cohorts(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    cohorts = await db["cohorts"].find({"institution_id": inst_id}).to_list(500)
    return [
        CohortResponse(
            id=str(c["_id"]),
            institution_id=c.get("institution_id", inst_id),
            name=c.get("name", ""),
            year=c.get("year", ""),
            branch=c.get("branch", ""),
            section=c.get("section", ""),
        )
        for c in cohorts
    ]

@router.post("/cohorts", response_model=CohortResponse, status_code=status.HTTP_200_OK)
async def create_cohort(
    payload: CohortCreateRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    doc = {
        "institution_id": inst_id,
        "name": payload.name.strip(),
        "year": payload.year.strip(),
        "branch": payload.branch.strip(),
        "section": (payload.section or "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await db["cohorts"].insert_one(doc)

    return CohortResponse(
        id=str(result.inserted_id),
        institution_id=inst_id,
        name=doc["name"],
        year=doc["year"],
        branch=doc["branch"],
        section=doc["section"],
    )

@router.get("/admin/assessments")
async def get_admin_assessments(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    cohorts = await db["cohorts"].find({"institution_id": inst_id}).to_list(1000)
    cohort_map = {str(c["_id"]): c.get("name", "") for c in cohorts}
    cohort_ids = list(cohort_map.keys())

    assessments = await db["assessments"].find({"cohort_id": {"$in": cohort_ids}}).sort("created_at", -1).to_list(500)
    return [
        {
            "id": str(a["_id"]),
            "title": a.get("title", ""),
            "cohort_id": a.get("cohort_id", ""),
            "cohort_name": cohort_map.get(a.get("cohort_id", ""), "Cohort"),
            "start_time": a.get("start_time", ""),
            "end_time": a.get("end_time", ""),
            "created_at": a.get("created_at", "")
        }
        for a in assessments
    ]

@router.post("/cohorts/join")
async def join_cohort(
    payload: JoinCohortRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    cohort_id_str = payload.cohort_id or payload.code
    if not cohort_id_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cohort ID or code is required",
        )

    cohort = None
    try:
        cohort = await db["cohorts"].find_one({"_id": ObjectId(cohort_id_str)})
    except Exception:
        pass

    if not cohort:
        cohort = await db["cohorts"].find_one({"name": cohort_id_str})

    if not cohort:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cohort not found",
        )

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {
            "$set": {
                "cohort_id": str(cohort["_id"]),
                "institution_id": cohort.get("institution_id"),
            }
        }
    )

    return {
        "cohort_id": str(cohort["_id"]),
        "name": cohort["name"],
        "message": f"Successfully joined cohort {cohort['name']}",
    }

@router.post("/assessments")
async def create_assessment(
    payload: AssessmentCreateRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = await ensure_institution_id(db, current_user)

    # Scoping check: verify cohort belongs to admin's institution
    cohort_doc = None
    try:
        cohort_doc = await db["cohorts"].find_one({"_id": ObjectId(payload.cohort_id)})
    except Exception:
        pass
    if not cohort_doc or cohort_doc.get("institution_id") != inst_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cohort not found or not owned by your institution",
        )

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
        "cohort_id": payload.cohort_id,
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
        "cohort_id": assessment_doc["cohort_id"],
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
    cohort_id = current_user.get("cohort_id")

    # If student has no cohort yet, try to auto-match first cohort of matching year
    if not cohort_id:
        user_year = current_user.get("year") or "1st Year"
        user_inst = current_user.get("institution_id")
        query = {"year": user_year}
        if user_inst:
            query["institution_id"] = user_inst
        matching_cohort = await db["cohorts"].find_one(query)
        if matching_cohort:
            cohort_id = str(matching_cohort["_id"])
            await db["users"].update_one(
                {"_id": current_user["_id"]},
                {
                    "$set": {
                        "cohort_id": cohort_id,
                        "institution_id": matching_cohort.get("institution_id"),
                    }
                }
            )

    if not cohort_id:
        return []

    # Scoping check: verify student's cohort belongs to student's institution
    cohort = None
    try:
        cohort = await db["cohorts"].find_one({"_id": ObjectId(cohort_id)})
    except Exception:
        pass

    if not cohort:
        return []

    user_inst = current_user.get("institution_id")
    if user_inst and cohort.get("institution_id") and user_inst != cohort.get("institution_id"):
        return []

    now_dt = datetime.now(timezone.utc)

    # Fetch assessments assigned to this cohort
    assessments_cursor = db["assessments"].find({"cohort_id": cohort_id})
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

        # IMPORTANT: Never include correct_option in this response
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

    # Scoping check: student's institution must match assessment's cohort institution
    cohort = await db["cohorts"].find_one({"_id": ObjectId(assessment["cohort_id"])})
    user_inst = current_user.get("institution_id")
    if cohort and user_inst and cohort.get("institution_id") and user_inst != cohort.get("institution_id"):
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

    cohort_id_str = assessment.get("cohort_id")
    cohort = await db["cohorts"].find_one({"_id": ObjectId(cohort_id_str)})
    if not cohort or cohort.get("institution_id") != inst_id:
        raise HTTPException(status_code=403, detail="Forbidden: Assessment does not belong to your institution")

    total_assigned = await db["users"].count_documents({
        "cohort_id": cohort_id_str,
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
        "cohort_name": cohort.get("name", ""),
        "total_assigned": total_assigned,
        "total_attempted": len(results_list),
        "leaderboard": results_list
    }

