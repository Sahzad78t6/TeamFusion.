import asyncio
from datetime import datetime, timezone
import logging
import os
import random
import subprocess
import sys
import tempfile
from typing import Any, Dict, List, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.db import get_db
from app.models import CodeSubmitRequest, CodeSubmitResponse, ContestCreateRequest, TestCaseResult

logger = logging.getLogger("growthos.contests")

router = APIRouter(tags=["contests"])

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") not in ["INSTITUTION_ADMIN", "PLATFORM_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

RUNNER_WRAPPER = """import sys

def _audit_hook(event, args):
    if any(event.startswith(prefix) for prefix in ("socket.", "http.", "urllib.")):
        raise PermissionError("Network access blocked in contest sandbox: " + str(event))

sys.addaudithook(_audit_hook)

with open(r"__SOLUTION_PATH__", "r", encoding="utf-8") as _f:
    _code = _f.read()

exec(compile(_code, "solution.py", "exec"), {})
"""

def _execute_test_case_sync(code: str, test_input: str, expected_output: str, timeout_sec: float = 2.0) -> bool:
    with tempfile.TemporaryDirectory() as tmpdir:
        solution_path = os.path.join(tmpdir, "solution.py")
        wrapper_path = os.path.join(tmpdir, "wrapper.py")

        with open(solution_path, "w", encoding="utf-8") as f:
            f.write(code)

        with open(wrapper_path, "w", encoding="utf-8") as f:
            f.write(RUNNER_WRAPPER.replace("__SOLUTION_PATH__", solution_path))

        env = {
            "SYSTEMROOT": os.environ.get("SYSTEMROOT", "C:\\Windows"),
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": "",
            "PYTHONNOUSERSITE": "1",
        }

        try:
            proc = subprocess.run(
                [sys.executable, "-I", "-s", wrapper_path],
                input=test_input,
                capture_output=True,
                text=True,
                timeout=timeout_sec,
                cwd=tmpdir,
                env=env,
            )
            actual = proc.stdout.strip()
            expected = expected_output.strip()
            return (proc.returncode == 0) and (actual == expected)
        except subprocess.TimeoutExpired:
            return False
        except Exception as exc:
            logger.warning("Sandbox execution error: %s", exc)
            return False

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

# POST /institutions/contests (Admin)
@router.post("/institutions/contests")
@router.post("/contests")
async def create_contest_session(
    payload: ContestCreateRequest,
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = current_user.get("institution_id")

    # Scoping check: verify cohort belongs to admin's institution
    cohort_doc = None
    try:
        cohort_doc = await db["cohorts"].find_one({"_id": ObjectId(payload.cohort_id)})
    except Exception:
        pass

    if not cohort_doc or (inst_id and cohort_doc.get("institution_id") != inst_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cohort not found or not owned by your institution",
        )

    try:
        start_dt = _parse_datetime(payload.start_time)
        end_dt = _parse_datetime(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid start_time or end_time format: {e}")

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # Randomly sample question_count from coding_bank
    all_questions = await db["coding_bank"].find({}).to_list(100)
    if not all_questions:
        raise HTTPException(status_code=404, detail="No questions available in coding_bank")

    sample_size = min(payload.question_count, len(all_questions))
    selected_questions = random.sample(all_questions, sample_size)
    question_ids = [ObjectId(q["_id"]) for q in selected_questions]

    session_doc = {
        "cohort_id": payload.cohort_id,
        "institution_id": inst_id or cohort_doc.get("institution_id"),
        "question_ids": question_ids,
        "start_time": start_dt,
        "end_time": end_dt,
        "duration_minutes": payload.duration_minutes,
        "created_at": datetime.now(timezone.utc),
    }

    res = await db["contest_sessions"].insert_one(session_doc)
    session_id = str(res.inserted_id)

    # Return created session details without expected_output
    return {
        "id": session_id,
        "cohort_id": payload.cohort_id,
        "institution_id": session_doc["institution_id"],
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
    cohort_id = current_user.get("cohort_id")
    if not cohort_id:
        return None

    # Scoping check: verify student's cohort belongs to student's institution
    cohort = None
    try:
        cohort = await db["cohorts"].find_one({"_id": ObjectId(cohort_id)})
    except Exception:
        pass

    user_inst = current_user.get("institution_id")
    if cohort and user_inst and cohort.get("institution_id") and user_inst != cohort.get("institution_id"):
        return None

    now = datetime.now(timezone.utc)

    # Look for sessions assigned to student's cohort
    cohort_queries = [str(cohort_id)]
    if ObjectId.is_valid(cohort_id):
        cohort_queries.append(ObjectId(cohort_id))

    sessions = await db["contest_sessions"].find(
        {"cohort_id": {"$in": cohort_queries}}
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

    # Fetch questions for active session
    q_docs = await db["coding_bank"].find(
        {"_id": {"$in": active_session.get("question_ids", [])}}
    ).to_list(100)

    # Map preserving question order, and never expose expected_output
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
        "cohort_id": str(active_session.get("cohort_id")),
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

    # Scoping check: student's institution must match contest's cohort institution
    cohort = await db["cohorts"].find_one({"_id": ObjectId(session["cohort_id"])})
    user_inst = current_user.get("institution_id")
    if cohort and user_inst and cohort.get("institution_id") and user_inst != cohort.get("institution_id"):
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
    results: List[TestCaseResult] = []

    # Execute code asynchronously in threadpool to prevent blocking the event loop
    for index, tc in enumerate(test_cases):
        tc_input = tc.get("input", "")
        tc_expected = tc.get("expected_output", "")
        passed = await asyncio.to_thread(
            _execute_test_case_sync,
            payload.code,
            tc_input,
            tc_expected,
            2.0,
        )
        results.append(TestCaseResult(test_case_index=index, passed=passed))

    overall_passed = bool(results) and all(r.passed for r in results)

    # Persist in code_submissions
    submission_doc = {
        "contest_id": ObjectId(id),
        "question_id": ObjectId(payload.question_id),
        "user_id": user_obj_id,
        "code": payload.code,
        "passed": overall_passed,
        "results": [r.model_dump() for r in results],
        "submitted_at": now_dt,
    }
    await db["code_submissions"].insert_one(submission_doc)

    return CodeSubmitResponse(passed=overall_passed, results=results)

# GET /institutions/admin/contests (Admin)
@router.get("/institutions/admin/contests")
async def get_admin_contests(
    current_user: dict = Depends(require_admin),
):
    db = get_db()
    inst_id = current_user.get("institution_id")

    cohorts = await db["cohorts"].find({"institution_id": inst_id}).to_list(1000)
    cohort_map = {str(c["_id"]): c.get("name", "") for c in cohorts}
    cohort_ids = list(cohort_map.keys())

    contests = await db["contest_sessions"].find({"cohort_id": {"$in": cohort_ids}}).sort("created_at", -1).to_list(500)
    return [
        {
            "id": str(c["_id"]),
            "cohort_id": c.get("cohort_id", ""),
            "cohort_name": cohort_map.get(str(c.get("cohort_id", "")), "Cohort"),
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

    cohort_id_str = str(session.get("cohort_id"))
    cohort = await db["cohorts"].find_one({"_id": ObjectId(cohort_id_str)})
    if not cohort or (inst_id and cohort.get("institution_id") != inst_id):
        raise HTTPException(status_code=403, detail="Forbidden: Contest does not belong to your institution")

    total_assigned = await db["users"].count_documents({
        "cohort_id": cohort_id_str,
        "role": "STUDENT"
    })

    submissions = await db["code_submissions"].find({"contest_id": ObjectId(id)}).to_list(1000)

    # Group submissions by user_id
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
        # Score = count of distinct passed questions / total_questions * 100
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
        "cohort_name": cohort.get("name", ""),
        "total_assigned": total_assigned,
        "total_attempted": len(results_list),
        "leaderboard": results_list
    }

