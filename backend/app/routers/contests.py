import asyncio
from datetime import datetime, timezone
import logging
import os
import random
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
import httpx

from app.auth import get_current_user
from app.db import get_db
from app.rewards import award_achievement_if_not_exists
from app.models import CodeSubmitRequest, CodeSubmitResponse, ContestCreateRequest, TestCaseResult

logger = logging.getLogger("growthos.contests")

router = APIRouter(tags=["contests"])

PISTON_API_URL = os.getenv("PISTON_API_URL", "https://emkc.org/api/v2/piston/execute")

PISTON_LANG_MAP = {
    "python": "python",
    "javascript": "javascript",
    "js": "javascript",
    "java": "java",
    "c++": "cpp",
    "cpp": "cpp",
    "c": "c",
}

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["INSTITUTION_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

def _parse_datetime(dt_val: Any) -> datetime:
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            return dt_val.replace(tzinfo=timezone.utc)
        return dt_val
    if isinstance(dt_val, str):
        cleaned = dt_val.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    raise ValueError(f"Cannot parse datetime from {dt_val}")

async def _execute_test_cases_piston(
    language: str,
    code: str,
    test_cases: List[dict],
    timeout_sec: float = 6.0
) -> tuple[Optional[bool], List[TestCaseResult], Optional[str]]:
    piston_lang = PISTON_LANG_MAP.get(language.lower().strip(), "python")
    results: List[TestCaseResult] = []

    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        async with httpx.AsyncClient(timeout=timeout_sec, headers=headers) as client:
            for index, tc in enumerate(test_cases):
                tc_input = tc.get("input", "")
                tc_expected = tc.get("expected_output", "").strip()

                payload = {
                    "language": piston_lang,
                    "version": "*",
                    "files": [{"content": code}],
                    "stdin": tc_input,
                }

                resp = await client.post(PISTON_API_URL, json=payload)
                if resp.status_code != 200:
                    logger.warning(f"Piston HTTP error status: {resp.status_code}, body: {resp.text}")
                    return (
                        None,
                        [],
                        "Execution service unavailable, submission saved for manual review"
                    )

                data = resp.json()
                run_stage = data.get("run", {})
                stdout = run_stage.get("stdout", "").strip()
                code_exit = run_stage.get("code", 0)

                passed = (code_exit == 0) and (stdout == tc_expected)
                results.append(TestCaseResult(test_case_index=index, passed=passed))

        overall_passed = bool(results) and all(r.passed for r in results)
        return (overall_passed, results, None)
    except Exception as exc:
        logger.warning(f"Piston API execution failed or timed out: {exc}")
        return (
            None,
            [],
            "Execution service unavailable, submission saved for manual review"
        )

# POST /institutions/contests (Admin)
@router.post("/institutions/contests")
@router.post("/contests")
async def create_contest_session(
    payload: ContestCreateRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = current_user.get("institution_id")
    if not inst_id:
        inst_doc = {
            "name": f"Institution {str(current_user['_id'])[-6:]}",
            "created_by_admin_id": str(current_user["_id"]),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        inst_res = await db["institutions"].insert_one(inst_doc)
        inst_id = str(inst_res.inserted_id)
        await db["users"].update_one(
            {"_id": current_user["_id"]},
            {"$set": {"institution_id": inst_id}}
        )

    try:
        start_dt = _parse_datetime(payload.start_time)
        end_dt = _parse_datetime(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid start_time or end_time format: {e}")

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    all_questions = await db["coding_bank"].find({}).to_list(100)
    if not all_questions:
        raise HTTPException(status_code=404, detail="No questions available in coding_bank")

    sample_size = min(payload.question_count, len(all_questions))
    selected_questions = random.sample(all_questions, sample_size)
    question_ids = [ObjectId(q["_id"]) for q in selected_questions]

    session_doc = {
        "institution_id": inst_id,
        "question_ids": question_ids,
        "start_time": start_dt,
        "end_time": end_dt,
        "duration_minutes": payload.duration_minutes,
        "created_at": datetime.now(timezone.utc),
    }

    res = await db["contest_sessions"].insert_one(session_doc)
    session_id = str(res.inserted_id)

    return {
        "id": session_id,
        "institution_id": inst_id,
        "question_ids": [str(qid) for qid in question_ids],
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat(),
        "duration_minutes": payload.duration_minutes,
        "created_at": session_doc["created_at"].isoformat(),
    }

# GET /contests/active (Student)
@router.get("/contests/active")
async def get_active_contest(
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_inst = current_user.get("institution_id")
    if not user_inst:
        return None

    now = datetime.now(timezone.utc)

    sessions = await db["contest_sessions"].find(
        {"institution_id": user_inst}
    ).sort("created_at", -1).to_list(50)

    active_session = None
    for s in sessions:
        try:
            s_start = _parse_datetime(s.get("start_time"))
            s_end = _parse_datetime(s.get("end_time"))
            if s_start <= now <= s_end:
                active_session = s
                break
        except Exception:
            continue

    if not active_session:
        return None

    q_docs = await db["coding_bank"].find(
        {"_id": {"$in": active_session.get("question_ids", [])}}
    ).to_list(100)

    q_map = {str(q["_id"]): q for q in q_docs}
    formatted_questions = []
    for qid in active_session.get("question_ids", []):
        q = q_map.get(str(qid))
        if q:
            formatted_questions.append({
                "id": str(q["_id"]),
                "title": q.get("title", ""),
                "description": q.get("description", ""),
                "difficulty": q.get("difficulty", "Easy"),
                "starter_code": q.get("starter_code", ""),
            })

    s_start_dt = _parse_datetime(active_session["start_time"])
    s_end_dt = _parse_datetime(active_session["end_time"])

    return {
        "id": str(active_session["_id"]),
        "institution_id": user_inst,
        "start_time": s_start_dt.isoformat(),
        "end_time": s_end_dt.isoformat(),
        "duration_minutes": active_session.get("duration_minutes"),
        "questions": formatted_questions,
    }

# POST /contests/{id}/start (Student)
@router.post("/contests/{id}/start")
async def start_contest_attempt(
    id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid contest id")

    session = await db["contest_sessions"].find_one({"_id": ObjectId(id)})
    if not session:
        raise HTTPException(status_code=404, detail="Contest session not found")

    user_inst = current_user.get("institution_id")
    if user_inst and session.get("institution_id") and user_inst != session.get("institution_id"):
        raise HTTPException(status_code=403, detail="Forbidden: Contest does not belong to your institution")

    user_obj_id = ObjectId(current_user["_id"])
    now_dt = datetime.now(timezone.utc)
    existing = await db["contest_attempts"].find_one({"contest_id": ObjectId(id), "user_id": user_obj_id})
    if not existing:
        await db["contest_attempts"].insert_one({
            "contest_id": ObjectId(id),
            "user_id": user_obj_id,
            "start_time": now_dt,
        })
        start_dt = now_dt
    else:
        start_dt = existing.get("start_time", now_dt)

    return {
        "status": "started",
        "start_time": start_dt.isoformat(),
        "duration_minutes": session.get("duration_minutes"),
    }

# POST /contests/{id}/submit (Student)
@router.post("/contests/{id}/submit", response_model=CodeSubmitResponse)
async def submit_contest_code(
    id: str,
    payload: CodeSubmitRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid contest session id")
    if not ObjectId.is_valid(payload.question_id):
        raise HTTPException(status_code=400, detail="Invalid question_id")

    session = await db["contest_sessions"].find_one({"_id": ObjectId(id)})
    if not session:
        raise HTTPException(status_code=404, detail="Contest session not found")

    user_inst = current_user.get("institution_id")
    if user_inst and session.get("institution_id") and user_inst != session.get("institution_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Contest does not belong to your institution",
        )

    # Window & Duration enforcement
    now_dt = datetime.now(timezone.utc)
    s_start = _parse_datetime(session["start_time"])
    s_end = _parse_datetime(session["end_time"])

    if now_dt > s_end:
        raise HTTPException(status_code=400, detail="Contest time window has closed")
    if now_dt < s_start:
        raise HTTPException(status_code=400, detail="Contest has not opened yet")

    user_obj_id = ObjectId(current_user["_id"])
    duration_min = session.get("duration_minutes")
    if duration_min:
        attempt = await db["contest_attempts"].find_one({"contest_id": ObjectId(id), "user_id": user_obj_id})
        if attempt:
            att_start = _parse_datetime(attempt["start_time"])
            if now_dt > (att_start + timedelta(minutes=duration_min)):
                raise HTTPException(status_code=400, detail="Contest time limit for your attempt has expired")
        else:
            await db["contest_attempts"].insert_one({
                "contest_id": ObjectId(id),
                "user_id": user_obj_id,
                "start_time": now_dt,
            })

    question = await db["coding_bank"].find_one({"_id": ObjectId(payload.question_id)})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    test_cases = question.get("test_cases", [])
    lang_str = (payload.language or "python").strip()

    overall_passed, results, error_msg = await _execute_test_cases_piston(
        lang_str,
        payload.code,
        test_cases,
        6.0
    )

    submission_doc = {
        "contest_id": ObjectId(id),
        "question_id": ObjectId(payload.question_id),
        "user_id": user_obj_id,
        "language": lang_str,
        "code": payload.code,
        "passed": overall_passed,
        "results": [r.model_dump() for r in results],
        "error": error_msg,
        "submitted_at": now_dt,
    }
    await db["code_submissions"].insert_one(submission_doc)

    if overall_passed is True:
        await award_achievement_if_not_exists(db, str(user_obj_id), "contest_solver")

    return CodeSubmitResponse(passed=overall_passed, results=results, error=error_msg)

# GET /institutions/admin/contests (Admin)
@router.get("/institutions/admin/contests")
async def get_admin_contests(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = current_user.get("institution_id")

    contests = await db["contest_sessions"].find({"institution_id": inst_id}).sort("created_at", -1).to_list(500)
    return [
        {
            "id": str(c["_id"]),
            "question_count": len(c.get("question_ids", [])),
            "start_time": _parse_datetime(c["start_time"]).isoformat() if c.get("start_time") else "",
            "end_time": _parse_datetime(c["end_time"]).isoformat() if c.get("end_time") else "",
            "created_at": _parse_datetime(c["created_at"]).isoformat() if c.get("created_at") else ""
        }
        for c in contests
    ]

# GET /institutions/contests/{id}/results (Admin)
@router.get("/institutions/contests/{id}/results")
async def get_contest_results(
    id: str,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = current_user.get("institution_id")

    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid contest ID")

    session = await db["contest_sessions"].find_one({"_id": ObjectId(id)})
    if not session:
        raise HTTPException(status_code=404, detail="Contest session not found")

    if session.get("institution_id") != inst_id:
        raise HTTPException(status_code=403, detail="Forbidden: Contest does not belong to your institution")

    total_assigned = await db["users"].count_documents({
        "institution_id": inst_id,
        "role": "STUDENT"
    })

    submissions = await db["code_submissions"].find({"contest_id": ObjectId(id)}).to_list(1000)

    user_submissions = {}
    for sub in submissions:
        uid = str(sub["user_id"])
        if uid not in user_submissions:
            user_submissions[uid] = []
        user_submissions[uid].append(sub)

    user_ids = [ObjectId(uid) for uid in user_submissions.keys()]
    users = await db["users"].find({"_id": {"$in": user_ids}}).to_list(len(user_ids))
    users_map = {str(u["_id"]): u.get("name", "Student") for u in users}

    attempts = await db["contest_attempts"].find({"contest_id": ObjectId(id)}).to_list(500)
    attempts_map = {str(att["user_id"]): att.get("start_time") for att in attempts}

    q_count = len(session.get("question_ids", [])) or 1

    results_list = []
    for uid, subs in user_submissions.items():
        passed_q_ids = set()
        last_sub_time = None
        for s in subs:
            if s.get("passed"):
                passed_q_ids.add(str(s["question_id"]))
            s_time = s.get("submitted_at")
            if s_time and (last_sub_time is None or s_time > last_sub_time):
                last_sub_time = s_time

        score = round((len(passed_q_ids) / q_count) * 100.0, 1)
        start_time = attempts_map.get(uid) or last_sub_time

        time_taken_sec = 0
        if last_sub_time and start_time:
            try:
                st = _parse_datetime(start_time)
                et = _parse_datetime(last_sub_time)
                time_taken_sec = max(0, int((et - st).total_seconds()))
            except Exception:
                pass

        sub_at_str = _parse_datetime(last_sub_time).isoformat() if last_sub_time else ""

        results_list.append({
            "student_name": users_map.get(uid, "Student"),
            "score": score,
            "submitted_at": sub_at_str,
            "time_taken_seconds": time_taken_sec
        })

    results_list.sort(key=lambda x: (-x["score"], x["time_taken_seconds"]))
    for rank, item in enumerate(results_list, start=1):
        item["rank"] = rank

    return {
        "title": "Coding Contest",
        "total_assigned": total_assigned,
        "total_attempted": len(results_list),
        "leaderboard": results_list
    }
