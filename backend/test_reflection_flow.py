import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

async def test_reflection_flow():
    client = AsyncIOMotorClient("mongodb+srv://GrowthOS:sk%40786@cluster0.6egjrzi.mongodb.net/?appName=Cluster0")
    db = client["growthos_v2"]
    
    test_user_id = str(ObjectId())
    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 1. Insert entry into reflections collection
    doc = {
        "user_id": test_user_id,
        "mindset_state": "ecstatic",
        "entry_text": "Built and persisted Reflection Journal to MongoDB!",
        "reflection": "Built and persisted Reflection Journal to MongoDB!",
        "mood_score": 5,
        "created_at": now_iso
    }
    
    res = await db["reflections"].insert_one(doc)
    doc_id = str(res.inserted_id)
    print(f"[TEST 1] Inserted reflection entry ID: {doc_id}")
    
    # 2. Query back for test_user_id
    entries = await db["reflections"].find({"user_id": test_user_id}).sort("created_at", -1).to_list(10)
    assert len(entries) == 1, f"Expected 1 entry, got {len(entries)}"
    fetched = entries[0]
    assert fetched["mindset_state"] == "ecstatic"
    assert fetched["entry_text"] == "Built and persisted Reflection Journal to MongoDB!"
    print(f"[TEST 2] Query returned matching entry: {fetched['entry_text']}")
    
    # 3. Query for a different user_id
    other_user_id = str(ObjectId())
    other_entries = await db["reflections"].find({"user_id": other_user_id}).to_list(10)
    assert len(other_entries) == 0, f"Expected 0 entries for other user, got {len(other_entries)}"
    print(f"[TEST 3] Query for different user returned 0 entries as expected.")
    
    # Clean up test doc
    await db["reflections"].delete_one({"_id": res.inserted_id})
    print("[TEST 4] Test cleanup complete.")

if __name__ == "__main__":
    asyncio.run(test_reflection_flow())
