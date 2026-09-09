import asyncio
import secrets
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from app.main import app

async def run_part_e_verification():
    print("=" * 60)
    print("PART E VERIFICATION SUITE (Cohort Removal & Institution Scoping)")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # STEP 1: Register two institution admins
        admin1_email = f"vignan_admin_{secrets.token_hex(4)}@vignan.ac.in"
        res1 = await client.post("/auth/signup", json={
            "name": "Vignan Admin",
            "email": admin1_email,
            "password": "password123",
            "role": "INSTITUTION_ADMIN",
            "institution_name": "Vignan University"
        })
        assert res1.status_code == 200, f"Vignan Admin signup failed: {res1.text}"
        vignan_admin_data = res1.json()
        vignan_admin_token = vignan_admin_data["access_token"]
        vignan_inst_id = vignan_admin_data["user"]["institution_id"]
        assert vignan_inst_id is not None, "Vignan institution_id must not be None"

        admin2_email = f"testcoll_admin_{secrets.token_hex(4)}@testcollege.edu"
        res2 = await client.post("/auth/signup", json={
            "name": "Test College Admin",
            "email": admin2_email,
            "password": "password123",
            "role": "INSTITUTION_ADMIN",
            "institution_name": "Test College"
        })
        assert res2.status_code == 200, f"Test College Admin signup failed: {res2.text}"
        testcoll_admin_data = res2.json()
        testcoll_admin_token = testcoll_admin_data["access_token"]
        testcoll_inst_id = testcoll_admin_data["user"]["institution_id"]
        assert testcoll_inst_id != vignan_inst_id, "Institutions must have distinct IDs"

        print("1. [PASS] Registered two institution admins ('Vignan University' & 'Test College').")

        # STEP 2: Onboard student selecting Vignan University
        student_email = f"vignan_student_{secrets.token_hex(4)}@vignan.ac.in"
        res_stud = await client.post("/auth/signup", json={
            "name": "Vignan Student",
            "email": student_email,
            "password": "password123",
            "role": "STUDENT"
        })
        assert res_stud.status_code == 200, f"Student signup failed: {res_stud.text}"
        vignan_student_token = res_stud.json()["access_token"]

        res_onb = await client.post(
            "/onboarding",
            headers={"Authorization": f"Bearer {vignan_student_token}"},
            json={
                "goal": "software_engineering",
                "current_role": "1st Year",
                "institution_id": vignan_inst_id,
            }
        )
        assert res_onb.status_code == 200, f"Student onboarding failed: {res_onb.text}"
        student_user = res_onb.json()
        assert student_user["institution_id"] == vignan_inst_id, (
            f"Expected student institution_id == {vignan_inst_id}, got {student_user.get('institution_id')}"
        )
        assert "cohort_id" not in student_user or student_user.get("cohort_id") is None, "cohort_id should not exist on user response"

        print("2. [PASS] Onboarded student selecting Vignan University -> user.institution_id matches Vignan's ID.")

        # STEP 3: Vignan Admin creates assessment open now -> Vignan student sees it
        now = datetime.now(timezone.utc)
        start_time = (now - timedelta(minutes=5)).isoformat()
        end_time = (now + timedelta(hours=1)).isoformat()

        res_ass = await client.post(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {vignan_admin_token}"},
            json={
                "title": "Vignan Midterm Quiz",
                "description": "Direct institution assessment",
                "skill": "Python Syntax",
                "year": "1st Year",
                "topic_code": "dsa",
                "question_count": 2,
                "start_time": start_time,
                "end_time": end_time,
                "duration_minutes": 30,
            }
        )
        assert res_ass.status_code == 200, f"Create assessment failed: {res_ass.text}"
        vignan_assessment_id = res_ass.json()["id"]

        # Vignan student checks assessments
        res_v_stud_ass = await client.get(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_v_stud_ass.status_code == 200, f"Get assessments failed: {res_v_stud_ass.text}"
        v_assessments = res_v_stud_ass.json()
        assert any(a["id"] == vignan_assessment_id for a in v_assessments), "Vignan student should see the active assessment"

        print("3. [PASS] Vignan Admin created assessment -> Vignan student sees it in GET /institutions/assessments.")

        # STEP 4: Test College Admin & Student cross-tenant check
        # Register Test College Student
        t_student_email = f"testcoll_student_{secrets.token_hex(4)}@testcollege.edu"
        res_tc_stud = await client.post("/auth/signup", json={
            "name": "Test College Student",
            "email": t_student_email,
            "password": "password123",
            "role": "STUDENT"
        })
        tc_student_token = res_tc_stud.json()["access_token"]
        await client.post(
            "/onboarding",
            headers={"Authorization": f"Bearer {tc_student_token}"},
            json={
                "goal": "software_engineering",
                "current_role": "1st Year",
                "institution_id": testcoll_inst_id,
            }
        )

        # Test College admin list assessments
        res_tc_admin_ass = await client.get(
            "/institutions/admin/assessments",
            headers={"Authorization": f"Bearer {testcoll_admin_token}"}
        )
        assert res_tc_admin_ass.status_code == 200
        tc_admin_list = res_tc_admin_ass.json()
        assert not any(a["id"] == vignan_assessment_id for a in tc_admin_list), "Test College admin must NOT see Vignan assessment"

        # Test College student list active assessments
        res_tc_stud_ass = await client.get(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {tc_student_token}"}
        )
        assert res_tc_stud_ass.status_code == 200
        tc_stud_list = res_tc_stud_ass.json()
        assert not any(a["id"] == vignan_assessment_id for a in tc_stud_list), "Test College student must NOT see Vignan assessment"

        print("4. [PASS] Test College Admin and Student CANNOT see Vignan's assessment anywhere.")

        # STEP 5: Spoofed institution_id attempt in POST /institutions/assessments
        res_spoof = await client.post(
            "/institutions/assessments",
            headers={"Authorization": f"Bearer {vignan_admin_token}"},
            json={
                "title": "Spoofed Assessment",
                "description": "Attempting to create under Test College",
                "institution_id": testcoll_inst_id,  # Spoofed!
                "skill": "Security",
                "year": "1st Year",
                "topic_code": "dsa",
                "question_count": 1,
                "start_time": start_time,
                "end_time": end_time,
                "duration_minutes": 20,
            }
        )
        assert res_spoof.status_code == 200, f"Spoof test call failed: {res_spoof.text}"
        spoofed_res_data = res_spoof.json()
        assert spoofed_res_data["institution_id"] == vignan_inst_id, (
            f"Backend must override client body with admin token institution_id! Got {spoofed_res_data['institution_id']}"
        )

        print("5. [PASS] Backend ignored client-supplied institution_id body and bound to admin's own token institution_id.")

        # STEP 6: Student Profile structure & no cohort references
        res_me = await client.get("/auth/me", headers={"Authorization": f"Bearer {vignan_student_token}"})
        assert res_me.status_code == 200
        me_data = res_me.json()
        assert me_data.get("institution_id") == vignan_inst_id
        assert "cohort_id" not in me_data or me_data.get("cohort_id") is None

        print("6. [PASS] Student user model verified: cohort_id removed, institution_id retained.")

        # STEP 7: Institution Admin analytics & no cohort endpoints
        res_analytics = await client.get("/institutions/analytics", headers={"Authorization": f"Bearer {vignan_admin_token}"})
        assert res_analytics.status_code == 200
        an_data = res_analytics.json()
        assert "cohort_count" not in an_data, "cohort_count must be removed from analytics response"
        assert "total_students" in an_data and "assessment_count" in an_data and "contest_count" in an_data

        # Verify /institutions/cohorts endpoint is gone / 404
        res_cohorts = await client.get("/institutions/cohorts", headers={"Authorization": f"Bearer {vignan_admin_token}"})
        assert res_cohorts.status_code == 404, "Deprecated /institutions/cohorts route should return 404"

        print("7. [PASS] Institution Admin analytics verified: no cohort metrics, /institutions/cohorts returns 404.")

        # STEP 8: Student attempt & submission -> Vignan Admin Results page
        res_start = await client.post(
            f"/institutions/assessments/{vignan_assessment_id}/start",
            headers={"Authorization": f"Bearer {vignan_student_token}"}
        )
        assert res_start.status_code == 200

        # Submit answers
        q_ids = res_v_stud_ass.json()[0]["questions"]
        answers_payload = {q["id"]: 0 for q in q_ids}
        res_sub = await client.post(
            f"/institutions/assessments/{vignan_assessment_id}/submissions",
            headers={"Authorization": f"Bearer {vignan_student_token}"},
            json={"answers": answers_payload}
        )
        assert res_sub.status_code == 200

        # Vignan Admin inspects results leaderboard
        res_results = await client.get(
            f"/institutions/assessments/{vignan_assessment_id}/results",
            headers={"Authorization": f"Bearer {vignan_admin_token}"}
        )
        assert res_results.status_code == 200
        results_data = res_results.json()
        assert results_data["title"] == "Vignan Midterm Quiz"
        assert results_data["total_attempted"] >= 1
        assert len(results_data["leaderboard"]) >= 1
        assert results_data["leaderboard"][0]["student_name"] == "Vignan Student"

        print("8. [PASS] Vignan student submitted assessment -> appears accurately on Vignan Admin's Results & Leaderboard page.")

    print("=" * 60)
    print("ALL 8 VERIFICATION STEPS PASSED 100% SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_part_e_verification())
