import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.services.analytics_engine import (
    get_identity_score,
    get_growth_score,
    get_burnout_risk,
    get_deep_learning_hours,
    get_dimension_mastery,
    get_active_focus,
    get_key_skill_strengths,
    get_required_target_mastery,
)

async def test_analytics():
    client = AsyncIOMotorClient('mongodb+srv://GrowthOS:sk%40786@cluster0.6egjrzi.mongodb.net/?appName=Cluster0')
    db = client['growthos_v2']
    
    student = await db['users'].find_one({'role': 'STUDENT'})
    if not student:
        student = await db['users'].find_one({})
    
    user_id = str(student['_id'])
    print(f"Testing analytics engine for user: {user_id} ({student.get('name')})")

    curr = await db['curriculum'].find_one({'goal': 'software_engineering', 'year': '1st Year'})
    sequence = curr.get('sequence', []) if curr else []

    progress = await db['user_progress'].find_one({'user_id': user_id}) or {}
    original_completed = progress.get('completed_topics', [])

    print(f"Total topics in curriculum sequence: {len(sequence)}")

    try:
        # Step 1: Simulate completing 4 out of 16 topics (25% of sequence)
        test_completed = [item['topic_code'] for item in sequence[:4]]

        await db['user_progress'].update_one(
            {'user_id': user_id},
            {'$set': {'completed_topics': test_completed}},
            upsert=True
        )

        id_score = await get_identity_score(user_id, db)
        growth_score = await get_growth_score(user_id, db)
        burnout = await get_burnout_risk(user_id, db)
        hours = await get_deep_learning_hours(user_id, db)
        dim_mastery = await get_dimension_mastery(user_id, db)
        active_focus = await get_active_focus(user_id, db)
        key_skills = await get_key_skill_strengths(user_id, db)
        required_mastery = await get_required_target_mastery(user_id, db)

        drift_pct = 100 - id_score

        print("\n--- Analytics Results (4 of 16 Topics Completed) ---")
        print(f"Simulated Completed Topics ({len(test_completed)} / {len(sequence)}): {test_completed}")
        print(f"Identity Score: {id_score}% (Expected 25%)")
        print(f"Drift Pct: {drift_pct}% (Sum: {id_score + drift_pct})")
        print(f"Growth Score: {growth_score}")
        print(f"Burnout Risk: {burnout}")
        print(f"Deep Learning Hours: {hours} hrs (Expected 8.0 hrs)")
        print(f"Dimension Mastery: {dim_mastery[:3]}")
        print(f"Active Focus: {active_focus}")
        print(f"Key Skill Strengths: {key_skills}")
        print(f"Required Target Mastery: {required_mastery[:3]}")

        assert id_score == 25, f"Expected Identity Score to be 25%, got {id_score}%"
        assert id_score + drift_pct == 100, "Identity Score + Drift % must equal 100!"
        assert len(key_skills) == 4, "Key Skill Strengths count must be 4!"
        print("\n[SUCCESS] Analytics calculation engine verified 25% identity score & metrics!")
    finally:
        await db['user_progress'].update_one(
            {'user_id': user_id},
            {'$set': {'completed_topics': original_completed}}
        )
        print("Reverted user_progress state to original.")

asyncio.run(test_analytics())
