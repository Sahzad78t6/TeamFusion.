import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from app.routers.planner import get_topic_check, submit_topic_check
from app.models import TopicCheckSubmissionRequest

async def test_topic_checks_flow():
    client = AsyncIOMotorClient('mongodb+srv://GrowthOS:sk%40786@cluster0.6egjrzi.mongodb.net/?appName=Cluster0')
    db = client['growthos_v2']

    student = await db['users'].find_one({'role': 'STUDENT'})
    if not student:
        student = await db['users'].find_one({})

    user_id = str(student['_id'])
    print(f"Testing Topic Checks for Student: {user_id} ({student.get('name')})")

    # 1. Test GET /planner/tasks/comp_thinking/check
    check_data = await get_topic_check('comp_thinking', student)
    print("\n1. GET /planner/tasks/comp_thinking/check output:")
    print("   Available:", check_data.get('available'))
    print("   Questions count:", len(check_data.get('questions', [])))
    
    assert check_data.get('available') is True, "Expected check to be available for comp_thinking!"
    assert len(check_data.get('questions', [])) == 10, "Expected 10 questions!"

    # Verify no correct_option leak
    has_leak = any('correct_option' in q for q in check_data['questions'])
    assert not has_leak, "CRITICAL SECURITY ERROR: correct_option exposed in GET /check!"
    print("   Security check: correct_option NOT exposed!")

    # 2. Fetch answer key directly from MongoDB to test submit
    q_docs = await db['topic_checks'].find({'topic_code': 'comp_thinking'}).to_list(100)
    correct_key = {str(d['_id']): d['correct_option'] for d in q_docs}

    # 2A. Submit Failing Quiz (<80%)
    wrong_answers = {}
    for i, (qid, c_opt) in enumerate(correct_key.items()):
        if i < 4:
            wrong_answers[qid] = c_opt # 4 correct = 40%
        else:
            wrong_answers[qid] = (c_opt + 1) % 4 # 6 wrong

    fail_res = await submit_topic_check('comp_thinking', TopicCheckSubmissionRequest(answers=wrong_answers), student)
    print("\n2A. Submit Failing Quiz Result:")
    print("    Passed:", fail_res['passed'])
    print("    Score:", fail_res['score'])
    print("    Message:", fail_res['message'])

    assert fail_res['passed'] is False, "Expected quiz to fail with <80%!"
    assert fail_res['score'] == 40, f"Expected score 40%, got {fail_res['score']}%"

    # Verify user_progress did NOT add comp_thinking
    progress_fail = await db['user_progress'].find_one({'user_id': user_id}) or {}
    completed_fail = progress_fail.get('completed_topics', [])
    assert 'comp_thinking' not in completed_fail, "comp_thinking should NOT be marked complete on failed quiz!"
    print("    Verified topic remains incomplete on failure.")

    # 2B. Submit Passing Quiz (>=80%)
    pass_res = await submit_topic_check('comp_thinking', TopicCheckSubmissionRequest(answers=correct_key), student)
    print("\n2B. Submit Passing Quiz Result:")
    print("    Passed:", pass_res['passed'])
    print("    Score:", pass_res['score'])
    print("    Message:", pass_res['message'])

    assert pass_res['passed'] is True, "Expected quiz to pass with 100%!"
    assert pass_res['score'] == 100, f"Expected score 100%, got {pass_res['score']}%"

    # Verify user_progress added comp_thinking
    progress_pass = await db['user_progress'].find_one({'user_id': user_id}) or {}
    completed_pass = progress_pass.get('completed_topics', [])
    assert 'comp_thinking' in completed_pass, "comp_thinking MUST be marked complete on passed quiz!"
    print("    Verified topic marked complete in user_progress on success!")

    # 3. Test Unseeded / Nonexistent Topic Code (Graceful Fallback)
    unseeded_check = await get_topic_check('nonexistent_topic_xyz', student)
    print("\n3. GET /planner/tasks/nonexistent_topic_xyz/check output:")
    print("   Available:", unseeded_check.get('available'))
    assert unseeded_check.get('available') is False, "Expected available=False for unseeded topic!"
    print("    Verified unseeded topic returns available=False for graceful frontend fallback!")

    # Revert test progress cleanup
    await db['user_progress'].update_one({'user_id': user_id}, {'$pull': {'completed_topics': 'comp_thinking'}})
    print("\n[SUCCESS] All Topic Check Verification Tests Passed!")

asyncio.run(test_topic_checks_flow())
