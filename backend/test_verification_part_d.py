import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from httpx import ASGITransport, AsyncClient

# Add backend directory to python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app

async def run_verification():
    print("============================================================")
    print("STARTING PART D — VERIFICATION SUITE")
    print("============================================================")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        
        # ------------------------------------------------------------
        # STEP 1: Create two institutions via admin signups
        # ------------------------------------------------------------
        vignan_admin_email = f"admin_vignan_{int(datetime.now().timestamp())}@vignan.ac.in"
        test_college_admin_email = f"admin_testcollege_{int(datetime.now().timestamp())}@testcollege.edu"

        res1 = await client.post("/auth/signup", json={
            "name": "Vignan Admin",
            "email": vignan_admin_email,
            "password": "Password123!",
            "role": "INSTITUTION_ADMIN",
            "institution_name": "Vignan University"
        })
        assert res1.status_code == 200, f"Vignan admin signup failed: {res1.text}"
        vignan_admin_data = res1.json()
        vignan_admin_token = vignan_admin_data["access_token"]
        vignan_inst_id = vignan_admin_data["user"]["institution_id"]

        res2 = await client.post("/auth/signup", json={
            "name": "Test College Admin",
            "email": test_college_admin_email,
            "password": "Password123!",
            "role": "INSTITUTION_ADMIN",
            "institution_name": "Test College"
        })
        assert res2.status_code == 200, f"Test College admin signup failed: {res2.text}"
        test_college_admin_data = res2.json()
        test_college_admin_token = test_college_admin_data["access_token"]
        test_college_inst_id = test_college_admin_data["user"]["institution_id"]

        assert vignan_inst_id != test_college_inst_id, "Institutions must have distinct IDs"
        print(f"[PASS] STEP 1: Created Vignan University ({vignan_inst_id}) and Test College ({test_college_inst_id})")

        # ------------------------------------------------------------
        # STEP 2: Onboard student selecting "Vignan University" from dropdown
        # ------------------------------------------------------------
        # First verify GET /institutions/list contains Vignan University
        res_list = await client.get("/institutions/list")
        assert res_list.status_code == 200, f"GET /institutions/list failed: {res_list.text}"
        insts_list = res_list.json()
        vignan_entry = next((i for i in insts_list if i["id"] == vignan_inst_id), None)
        assert vignan_entry is not None, f"Vignan University not found in /institutions/list"
        assert vignan_entry["name"] == "Vignan University"

        # Signup a student
        vignan_student_email = f"student_vignan_{int(datetime.now().timestamp())}@vignan.ac.in"
        res_student_signup = await client.post("/auth/signup", json={
            "name": "Vignan Student",
            "email": vignan_student_email,
            "password": "Password123!",
            "role": "STUDENT"
        })
        assert res_student_signup.status_code == 200, f"Student signup failed: {res_student_signup.text}"
        vignan_student_token = res_student_signup.json()["access_token"]

        # Submit onboarding selecting Vignan University institution_id
        res_onboard = await client.post(
            "/onboarding",
            json={
                "goal": "software_engineering",
                "target_role": "software_engineering",
                "current_role": "1st Year",
                "skills": ["Vignan University"],
                "known_topics": ["python_basics"],
                "institution_id": vignan_inst_id
            },
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_onboard.status_code == 200, f"Onboarding failed: {res_onboard.text}"
        student_user = res_onboard.json()
        assert student_user["institution_id"] == vignan_inst_id, f"Expected user.institution_id == {vignan_inst_id}, got {student_user['institution_id']}"
        print(f"[PASS] STEP 2: Student onboarded with institution_id matching Vignan University ({vignan_inst_id})")

        # ------------------------------------------------------------
        # STEP 3: Vignan Admin creates cohort + assessment, Test College student gets 0 assessments
        # ------------------------------------------------------------
        # Create cohort as Vignan Admin
        res_cohort = await client.post(
            "/institutions/cohorts",
            json={
                "name": "Vignan CSE 2026",
                "year": "1st Year",
                "branch": "CSE",
                "section": "A"
            },
            headers={"Authorization": f"Bearer {vignan_admin_token}"}
        )
        assert res_cohort.status_code == 200, f"Create cohort failed: {res_cohort.text}"
        vignan_cohort_id = res_cohort.json()["id"]

        # Assign vignan student to vignan cohort
        res_join = await client.post(
            "/institutions/cohorts/join",
            json={"cohort_id": vignan_cohort_id},
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_join.status_code == 200

        # Schedule assessment as Vignan Admin
        now_dt = datetime.now(timezone.utc)
        start_iso = now_dt.isoformat()
        end_iso = (now_dt + timedelta(hours=1)).isoformat()

        res_assess = await client.post(
            "/institutions/assessments",
            json={
                "title": "Vignan Python Challenge",
                "description": "Exclusively for Vignan Students",
                "cohort_id": vignan_cohort_id,
                "skill": "Python",
                "year": "1st Year",
                "topic_code": "python_basics",
                "question_count": 2,
                "start_time": start_iso,
                "end_time": end_iso,
                "duration_minutes": 30
            },
            headers={"Authorization": f"Bearer {vignan_admin_token}"}
        )
        assert res_assess.status_code == 200, f"Create assessment failed: {res_assess.text}"
        vignan_assessment_id = res_assess.json()["id"]

        # Create Test College Student & Cohort
        test_college_student_email = f"student_tc_{int(datetime.now().timestamp())}@testcollege.edu"
        res_tc_student_signup = await client.post("/auth/signup", json={
            "name": "Test College Student",
            "email": test_college_student_email,
            "password": "Password123!",
            "role": "STUDENT"
        })
        tc_student_token = res_tc_student_signup.json()["access_token"]
        await client.post(
            "/onboarding",
            json={
                "goal": "software_engineering",
                "target_role": "software_engineering",
                "current_role": "1st Year",
                "skills": ["Test College"],
                "institution_id": test_college_inst_id
            },
            headers={"Authorization": f"Bearer {tc_student_token}"}
        )

        # Test College student queries assessments
        res_tc_assessments = await client.get(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {tc_student_token}"}
        )
        assert res_tc_assessments.status_code == 200
        tc_assess_list = res_tc_assessments.json()
        assert not any(a["id"] == vignan_assessment_id for a in tc_assess_list), "Test College student MUST NOT see Vignan's assessment"
        print(f"[PASS] STEP 3: Vignan assessment scheduled, Test College student cannot see Vignan's assessment")

        # ------------------------------------------------------------
        # STEP 4: Vignan student submits -> Vignan Admin views Results & Leaderboard
        # ------------------------------------------------------------
        # Vignan student gets assessments
        res_v_assessments = await client.get(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_v_assessments.status_code == 200
        v_assess_list = res_v_assessments.json()
        vignan_assess_obj = next((a for a in v_assess_list if a["id"] == vignan_assessment_id), None)
        assert vignan_assess_obj is not None, "Vignan student must see Vignan's assessment"

        # Student starts attempt
        await client.post(
            f"/institutions/assessments/{vignan_assessment_id}/start",
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )

        # Student submits answers
        q_ids = [q["id"] for q in vignan_assess_obj["questions"]]
        answers = {qid: 0 for qid in q_ids}

        res_submit = await client.post(
            f"/institutions/assessments/{vignan_assessment_id}/submissions",
            json={"answers": answers},
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_submit.status_code == 200
        student_score = res_submit.json()["score"]

        # Vignan Admin fetches results
        res_results = await client.get(
            f"/institutions/assessments/{vignan_assessment_id}/results",
            headers={"Authorization": f"Bearer {vignan_admin_token}"}
        )
        assert res_results.status_code == 200, f"Results fetch failed: {res_results.text}"
        results_data = res_results.json()
        assert results_data["total_attempted"] == 1
        assert len(results_data["leaderboard"]) == 1
        assert results_data["leaderboard"][0]["student_name"] == "Vignan Student"
        assert results_data["leaderboard"][0]["score"] == student_score
        assert results_data["leaderboard"][0]["rank"] == 1
        print(f"[PASS] STEP 4: Student submission recorded, Vignan Admin results page displays student with score {student_score}% and rank #1")

        # ------------------------------------------------------------
        # STEP 5: Test College Admin attempts to hit Vignan's assessment results ID -> 403 Forbidden
        # ------------------------------------------------------------
        res_forbidden = await client.get(
            f"/institutions/assessments/{vignan_assessment_id}/results",
            headers={"Authorization": f"Bearer {test_college_admin_token}"}
        )
        assert res_forbidden.status_code in [403, 404], f"Expected 403/404, got {res_forbidden.status_code}: {res_forbidden.text}"
        print(f"[PASS] STEP 5: Test College Admin directly hitting Vignan assessment ID was blocked with HTTP {res_forbidden.status_code}")

        # ------------------------------------------------------------
        # STEP 6: Student attempting after end_time blocked with clear error
        # ------------------------------------------------------------
        # Create an expired assessment as Vignan Admin
        past_start = (now_dt - timedelta(hours=2)).isoformat()
        past_end = (now_dt - timedelta(hours=1)).isoformat()

        res_expired_assess = await client.post(
            "/institutions/assessments",
            json={
                "title": "Expired Test Assessment",
                "description": "Closed 1 hour ago",
                "cohort_id": vignan_cohort_id,
                "skill": "Python",
                "year": "1st Year",
                "topic_code": "python_basics",
                "question_count": 1,
                "start_time": past_start,
                "end_time": past_end,
                "duration_minutes": 30
            },
            headers={"Authorization": f"Bearer {vignan_admin_token}"}
        )
        assert res_expired_assess.status_code == 200
        expired_assessment_id = res_expired_assess.json()["id"]

        # Student attempts to submit expired assessment
        res_expired_submit = await client.post(
            f"/institutions/assessments/{expired_assessment_id}/submissions",
            json={"answers": {}},
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_expired_submit.status_code == 400
        err_detail = res_expired_submit.json()["detail"]
        assert "closed" in err_detail.lower() or "expired" in err_detail.lower(), f"Expected time expired error, got: {err_detail}"
        print(f"[PASS] STEP 6: Expired assessment submission correctly blocked with HTTP 400 error: '{err_detail}'")

        print("============================================================")
        print("ALL 6 VERIFICATION CHECKS PASSED SUCCESSFULLY! 100%")
        print("============================================================")

if __name__ == "__main__":
    asyncio.run(run_verification())
