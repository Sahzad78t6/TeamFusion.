import asyncio
import sys
import httpx
from datetime import datetime
from app.db import get_db, init_db, close_db
from app.main import app

async def run_verification():
    print("=== STARTING CAREER PATHWAY VERIFICATION ===")
    
    # 1. Initialize DB and seed
    await init_db()
    db = get_db()

    # 2. Check 40 curriculum documents
    curriculum_coll = db["curriculum"]
    all_curricula = await curriculum_coll.find({}).to_list(length=100)
    print(f"Total Curriculum Docs in DB: {len(all_curricula)}")
    assert len(all_curricula) == 40, f"Expected 40 curriculum docs, found {len(all_curricula)}"

    pairs = set()
    for c in all_curricula:
        pair = (c["goal"], c["year"])
        assert pair not in pairs, f"Duplicate pair found: {pair}"
        pairs.add(pair)
        assert len(c["sequence"]) >= 10, f"Sequence too short for {pair}: {len(c['sequence'])}"
    print("PASS 1: All 40 curriculum docs exist, one per (goal, year) pair, with non-empty sequences.")

    # 3. Check for dangling references in resources
    resources_coll = db["resources"]
    all_resources = await resources_coll.find({}).to_list(length=200)
    res_topic_codes = {r["topic_code"] for r in all_resources}

    dangling_codes = set()
    for c in all_curricula:
        for step in c["sequence"]:
            code = step["topic_code"]
            if code not in res_topic_codes:
                dangling_codes.add(code)

    print(f"Dangling topic_codes count: {len(dangling_codes)}")
    if dangling_codes:
        print(f"FAILED: Dangling topic_codes found: {dangling_codes}")
        sys.exit(1)
    print("PASS 2: Every topic_code in all 40 sequences has a matching resources doc. Zero dangling references!")

    # 4. In-Process HTTP API Verification with ASGITransport
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        ts = int(datetime.now().timestamp())

        # Sign up student 1: Cybersecurity + 3rd Year (Plan C)
        s1_email = f"cyber_3rd_{ts}@growthos.com"
        res = await client.post("/auth/signup", json={"email": s1_email, "password": "Password123!", "name": "Cyber 3rd Year"})
        assert res.status_code == 200, f"Signup failed: {res.text}"
        s1_token = res.json()["access_token"]

        # Onboard student 1
        res = await client.post("/onboarding", headers={"Authorization": f"Bearer {s1_token}"}, json={
            "goal": "cybersecurity",
            "target_role": "cybersecurity",
            "current_role": "3rd Year",
            "skills": ["College"],
        })
        assert res.status_code == 200, f"Onboarding failed: {res.text}"

        # Fetch Planner task for 3rd Year Cybersecurity
        res = await client.get("/planner", headers={"Authorization": f"Bearer {s1_token}"})
        assert res.status_code == 200
        tasks1 = res.json()
        assert len(tasks1) > 0, "No planner task returned"
        first_topic_3rd = tasks1[0]["title"]

        # Fetch Recommendations for 3rd Year Cybersecurity
        res = await client.get("/recommendation", headers={"Authorization": f"Bearer {s1_token}"})
        assert res.status_code == 200
        rec1 = res.json()
        assert rec1["priority"] == "P0", f"Expected P0 priority for Plan C Phase 1, got {rec1.get('priority')}"
        assert rec1["dimension"] == "role_specific", f"Expected role_specific dimension, got {rec1.get('dimension')}"
        assert "Phase 1" in rec1["phase"], f"Expected Phase 1, got {rec1.get('phase')}"
        print(f"PASS 3: Cybersecurity 3rd Year starts with P0/role_specific topic: '{first_topic_3rd}' ({rec1['priority']}, {rec1['dimension']}, {rec1['phase']})")

        # Sign up student 2: Cybersecurity + 1st Year (Plan A)
        s2_email = f"cyber_1st_{ts}@growthos.com"
        res = await client.post("/auth/signup", json={"email": s2_email, "password": "Password123!", "name": "Cyber 1st Year"})
        assert res.status_code == 200
        s2_token = res.json()["access_token"]

        # Onboard student 2
        res = await client.post("/onboarding", headers={"Authorization": f"Bearer {s2_token}"}, json={
            "goal": "cybersecurity",
            "target_role": "cybersecurity",
            "current_role": "1st Year",
            "skills": ["College"],
        })
        assert res.status_code == 200

        # Fetch Recommendations for 1st Year Cybersecurity
        res = await client.get("/recommendation", headers={"Authorization": f"Bearer {s2_token}"})
        assert res.status_code == 200
        rec2 = res.json()
        assert rec2["priority"] in ["P1", "P2"], f"Expected P1 or P2 priority for Plan A Phase 1, got {rec2.get('priority')}"
        assert rec2["dimension"] == "programming", f"Expected programming dimension, got {rec2.get('dimension')}"
        print(f"PASS 4: Cybersecurity 1st Year starts with foundation topic: '{rec2['current_topic']}' ({rec2['priority']}, {rec2['dimension']}), proving different starting point per year!")

        # Fetch Dashboard API for Student 1
        res = await client.get("/dashboard", headers={"Authorization": f"Bearer {s1_token}"})
        assert res.status_code == 200
        dash1 = res.json()
        assert "plan_label" in dash1 and dash1["plan_label"], "Missing plan_label in dashboard response"
        assert "phase_info" in dash1 and dash1["phase_info"], "Missing phase_info in dashboard response"
        print(f"PASS 5: Dashboard returns plan_label ('{dash1['plan_label']}') and phase_info ('{dash1['phase_info']['display']}')")

    await close_db()
    print("\n=== ALL 6 VERIFICATION CHECKS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(run_verification())
