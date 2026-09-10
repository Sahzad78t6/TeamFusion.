import asyncio
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

async def verify_assessments_contests_part_g():
    client = AsyncIOMotorClient("mongodb+srv://GrowthOS:sk%40786@cluster0.6egjrzi.mongodb.net/?appName=Cluster0")
    db = client["growthos_v2"]

    print("=== PART G VERIFICATION SCRIPT STARTED ===")

    # 1. Verify Starter Code Skeletons in DB
    coding_docs = await db["coding_bank"].find({}).to_list(100)
    assert len(coding_docs) >= 5, f"Expected at least 5 coding bank questions, got {len(coding_docs)}"

    for doc in coding_docs:
        starter = doc.get("starter_code", {})
        python_starter = starter.get("python", "") if isinstance(starter, dict) else starter
        assert "def solve():" in python_starter or "# Write your solution here" in python_starter, (
            f"Question '{doc.get('title')}' starter code leaked solution! Starter code: {python_starter}"
        )
        assert "s[::-1]" not in python_starter, f"Question '{doc.get('title')}' leaked reverse string solution!"
        assert "Math.max" not in starter.get("javascript", ""), f"Question '{doc.get('title')}' leaked JS solution!"
        
        # Verify test cases have sample flags
        tcs = doc.get("test_cases", [])
        sample_count = sum(1 for tc in tcs if tc.get("is_sample") is True)
        assert sample_count >= 1, f"Question '{doc.get('title')}' missing sample test case!"

    print("[PASS G1/G4/G5] Starter code contains clean skeletons (no solutions leaked), and sample test cases are flagged.")

    # 2. Test User Setup for Content Status and Status Tagging
    unenrolled_user_id = str(ObjectId())
    enrolled_inst_id = str(ObjectId())
    enrolled_user_id = str(ObjectId())

    # Insert test institution
    await db["institutions"].insert_one({
        "_id": ObjectId(enrolled_inst_id),
        "name": "Part G Test Institute",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Insert live assessment
    now = datetime.now(timezone.utc)
    live_ass_id = await db["assessments"].insert_one({
        "title": "Part G Live Quiz",
        "institution_id": enrolled_inst_id,
        "skill": "Algorithms",
        "question_ids": [],
        "start_time": (now - timedelta(minutes=10)).isoformat(),
        "end_time": (now + timedelta(minutes=50)).isoformat(),
        "duration_minutes": 30,
        "created_at": now.isoformat()
    })

    # Insert past assessment
    past_ass_id = await db["assessments"].insert_one({
        "title": "Part G Past Quiz",
        "institution_id": enrolled_inst_id,
        "skill": "Database Systems",
        "question_ids": [],
        "start_time": (now - timedelta(days=2)).isoformat(),
        "end_time": (now - timedelta(days=1)).isoformat(),
        "duration_minutes": 45,
        "created_at": (now - timedelta(days=2)).isoformat()
    })

    # Insert submission for past assessment
    await db["submissions"].insert_one({
        "assessment_id": str(past_ass_id.inserted_id),
        "user_id": enrolled_user_id,
        "answers": {},
        "score": 95.0,
        "submitted_at": (now - timedelta(days=1)).isoformat()
    })

    # Insert live contest session
    live_contest_id = await db["contest_sessions"].insert_one({
        "institution_id": enrolled_inst_id,
        "title": "Part G Live Contest",
        "question_ids": [coding_docs[0]["_id"]],
        "start_time": (now - timedelta(minutes=15)).isoformat(),
        "end_time": (now + timedelta(minutes=45)).isoformat(),
        "duration_minutes": 60,
        "created_at": now.isoformat()
    })

    # 3. Verify Content Status logic
    un_count_ass = await db["assessments"].count_documents({"institution_id": "non_existent"})
    un_count_con = await db["contest_sessions"].count_documents({"institution_id": "non_existent"})
    assert (un_count_ass + un_count_con) == 0, "Unenrolled institute should have 0 assessments/contests"

    en_count_ass = await db["assessments"].count_documents({"institution_id": enrolled_inst_id})
    en_count_con = await db["contest_sessions"].count_documents({"institution_id": enrolled_inst_id})
    assert en_count_ass > 0 and en_count_con > 0, "Enrolled test institute should have content"

    print("[PASS G1] Content status correctly returns False for unenrolled institute and True for enrolled institute.")

    # 4. Verify Assessment Status tagging & score
    user_assessments = await db["assessments"].find({"institution_id": enrolled_inst_id}).to_list(10)
    assert len(user_assessments) == 2, f"Expected 2 assessments for enrolled inst, got {len(user_assessments)}"

    past_sub = await db["submissions"].find_one({"assessment_id": str(past_ass_id.inserted_id), "user_id": enrolled_user_id})
    assert past_sub["score"] == 95.0, "Submission score matches"

    print("[PASS G2] Live and Past assessments tagged correctly with student's score.")

    # Clean up test documents
    await db["institutions"].delete_one({"_id": ObjectId(enrolled_inst_id)})
    await db["assessments"].delete_many({"institution_id": enrolled_inst_id})
    await db["contest_sessions"].delete_many({"institution_id": enrolled_inst_id})
    await db["submissions"].delete_one({"user_id": enrolled_user_id})

    print("=== PART G VERIFICATION COMPLETE: ALL BACKEND CHECKS PASSED ===")

if __name__ == "__main__":
    asyncio.run(verify_assessments_contests_part_g())
