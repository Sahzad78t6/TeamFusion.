import asyncio
import os
import sys
import unittest
from httpx import AsyncClient, ASGITransport

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.db import get_db, init_db, close_db
from app.curriculum_utils import get_current_topic

class TestPriorKnowledgeAndRoadmapEngine(unittest.IsolatedAsyncioTestCase):

    async def asyncSetUp(self):
        await init_db()
        self.db = get_db()
        self.transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=self.transport, base_url="http://test")

        # Clean test user documents
        await self.db["users"].delete_many({"email": {"$regex": "^test_pk_"}})
        await self.db["user_progress"].delete_many({"user_id": {"$regex": "^test_pk_"}})

    async def asyncTearDown(self):
        await self.db["users"].delete_many({"email": {"$regex": "^test_pk_"}})
        await self.db["user_progress"].delete_many({"user_id": {"$regex": "^test_pk_"}})
        await self.client.aclose()
        await close_db()

    async def _create_authenticated_user(self, name: str, email: str) -> tuple[str, dict]:
        resp = await self.client.post("/auth/signup", json={
            "name": name,
            "email": email,
            "password": "Password123!",
            "role": "STUDENT"
        })
        self.assertEqual(resp.status_code, 200, f"Signup failed: {resp.text}")
        data = resp.json()
        token = data["access_token"]
        user = data["user"]
        return token, user

    async def test_05_curriculum_topics_endpoint(self):
        """1. Verify GET /curriculum/topics returns lightweight sequence without auth."""
        resp = await self.client.get("/curriculum/topics?goal=software_engineering&year=1st%20Year")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        first_topic = data[0]
        self.assertIn("topic_code", first_topic)
        self.assertIn("label", first_topic)
        self.assertIn("dimension", first_topic)
        self.assertIn("priority", first_topic)
        self.assertIn("phase", first_topic)
        print(f"PASS: GET /curriculum/topics returned {len(data)} topics. First: {first_topic['topic_code']}")

    async def test_01_user_with_known_topics_skips_to_third_topic(self):
        """2. Onboard User A with first two topics pre-known -> confirm GET /recommendation returns third topic."""
        # Get topic sequence
        topics_resp = await self.client.get("/curriculum/topics?goal=software_engineering&year=1st%20Year")
        topics = topics_resp.json()
        self.assertGreaterEqual(len(topics), 3)

        topic1_code = topics[0]["topic_code"]
        topic2_code = topics[1]["topic_code"]
        topic3_code = topics[2]["topic_code"]

        token_a, user_a = await self._create_authenticated_user("User A", "test_pk_usera@example.com")
        headers = {"Authorization": f"Bearer {token_a}"}

        # Onboard User A with known_topics = [topic1_code, topic2_code]
        ob_resp = await self.client.post("/onboarding", headers=headers, json={
            "goal": "software_engineering",
            "current_role": "1st Year",
            "skills": ["MIT"],
            "known_topics": [topic1_code, topic2_code]
        })
        self.assertEqual(ob_resp.status_code, 200)

        # GET /recommendation
        rec_resp = await self.client.get("/recommendation", headers=headers)
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()

        self.assertEqual(rec_data["topic_code"], topic3_code, f"Expected topic {topic3_code}, got {rec_data.get('topic_code')}")
        print(f"PASS: User A skipped [{topic1_code}, {topic2_code}] and landed cleanly on 3rd topic: {topic3_code}")

    async def test_02_user_without_known_topics_starts_at_first_topic(self):
        """3. Onboard User B with zero known_topics -> confirm starting at first topic."""
        topics_resp = await self.client.get("/curriculum/topics?goal=software_engineering&year=1st%20Year")
        topics = topics_resp.json()
        topic1_code = topics[0]["topic_code"]

        token_b, user_b = await self._create_authenticated_user("User B", "test_pk_userb@example.com")
        headers = {"Authorization": f"Bearer {token_b}"}

        # Onboard User B with zero known_topics
        ob_resp = await self.client.post("/onboarding", headers=headers, json={
            "goal": "software_engineering",
            "current_role": "1st Year",
            "skills": ["Stanford"],
            "known_topics": []
        })
        self.assertEqual(ob_resp.status_code, 200)

        # GET /recommendation
        rec_resp = await self.client.get("/recommendation", headers=headers)
        self.assertEqual(rec_resp.status_code, 200)
        rec_data = rec_resp.json()

        self.assertEqual(rec_data["topic_code"], topic1_code, f"Expected topic {topic1_code}, got {rec_data.get('topic_code')}")
        print(f"PASS: User B with zero known topics started at first topic: {topic1_code}")

    async def test_03_completing_topic_advances_pointer(self):
        """4. Complete topic 1 for User B via PATCH /planner/tasks/:id -> confirm get_current_topic advances to topic 2."""
        topics_resp = await self.client.get("/curriculum/topics?goal=software_engineering&year=1st%20Year")
        topics = topics_resp.json()
        topic1_code = topics[0]["topic_code"]
        topic2_code = topics[1]["topic_code"]

        token_b, user_b = await self._create_authenticated_user("User B Completed", "test_pk_userb_comp@example.com")
        headers = {"Authorization": f"Bearer {token_b}"}

        await self.client.post("/onboarding", headers=headers, json={
            "goal": "software_engineering",
            "current_role": "1st Year",
            "skills": ["Stanford"],
            "known_topics": []
        })

        # Complete topic 1 via PATCH /planner/tasks/:id
        patch_resp = await self.client.patch(f"/planner/tasks/{topic1_code}", headers=headers, json={"completed": True})
        self.assertEqual(patch_resp.status_code, 200)

        # Check GET /planner
        planner_resp = await self.client.get("/planner", headers=headers)
        self.assertEqual(planner_resp.status_code, 200)
        planner_tasks = planner_resp.json()
        self.assertEqual(len(planner_tasks), 1)
        self.assertEqual(planner_tasks[0]["id"], topic2_code)
        print(f"PASS: Completed topic {topic1_code}; planner correctly advanced pointer to {topic2_code}")

    async def test_04_skipped_vs_completed_topics_distinction(self):
        """5. Confirm skipped_topics and completed_topics remain distinguishable in the DB."""
        topics_resp = await self.client.get("/curriculum/topics?goal=software_engineering&year=1st%20Year")
        topics = topics_resp.json()
        topic1_code = topics[0]["topic_code"]
        topic2_code = topics[1]["topic_code"]

        token_c, user_c = await self._create_authenticated_user("User C", "test_pk_userc@example.com")
        headers = {"Authorization": f"Bearer {token_c}"}

        # Onboard User C with topic 1 skipped
        await self.client.post("/onboarding", headers=headers, json={
            "goal": "software_engineering",
            "current_role": "1st Year",
            "skills": ["IIT Bombay"],
            "known_topics": [topic1_code]
        })

        # User C completes topic 2 via planner task completion
        await self.client.patch(f"/planner/tasks/{topic2_code}", headers=headers, json={"completed": True})

        # Check DB directly
        progress = await self.db["user_progress"].find_one({"user_id": str(user_c["id"])})
        self.assertIsNotNone(progress)

        db_skipped = progress.get("skipped_topics", [])
        db_completed = progress.get("completed_topics", [])

        self.assertEqual(db_skipped, [topic1_code], f"Expected skipped_topics to only have onboarding skips: {db_skipped}")
        self.assertIn(topic1_code, db_completed)
        self.assertIn(topic2_code, db_completed)
        self.assertEqual(len(db_completed), 2)

        # GET /dashboard response check
        dash_resp = await self.client.get("/dashboard", headers=headers)
        self.assertEqual(dash_resp.status_code, 200)
        dash_data = dash_resp.json()
        self.assertIn("skipped_topics", dash_data)
        self.assertEqual(len(dash_data["skipped_topics"]), 1)
        self.assertEqual(dash_data["skipped_topics"][0]["topic_code"], topic1_code)

        print(f"PASS: DB cleanly distinguishes skipped_topics {[topic1_code]} from completed_topics {db_completed}")

if __name__ == "__main__":
    unittest.main()
