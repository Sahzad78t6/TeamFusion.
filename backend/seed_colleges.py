import json
import sys
from pathlib import Path
from pymongo import MongoClient, TEXT, ASCENDING

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import settings

def seed_colleges():
    json_path = Path(__file__).resolve().parent / "app" / "data" / "colleges.json"
    if not json_path.exists():
        print(f"Error: Colleges JSON file not found at {json_path}", flush=True)
        sys.exit(1)

    print(f"Connecting to MongoDB at {settings.MONGO_URI} (db: {settings.DB_NAME})...", flush=True)
    client = MongoClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    collection = db["colleges_reference"]

    existing_count = collection.count_documents({})
    if existing_count > 0:
        print(f"Collection 'colleges_reference' already contains {existing_count} documents. Skipping seed.", flush=True)
        return existing_count

    print(f"Reading {json_path}...", flush=True)
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Loaded {len(data)} raw college entries. Formatting documents...", flush=True)
    documents = []
    for item in data:
        college_name = (item.get("college") or "").strip()
        if not college_name:
            continue
        documents.append({
            "college": college_name,
            "university": (item.get("university") or "").strip(),
            "college_type": (item.get("college_type") or "").strip(),
            "state": (item.get("state") or "").strip(),
            "district": (item.get("district") or "").strip(),
            "normalized_college": college_name.lower(),
        })

    print(f"Inserting {len(documents)} documents into 'colleges_reference'...", flush=True)
    batch_size = 5000
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        collection.insert_many(batch)
        print(f"Inserted batch {i // batch_size + 1} ({len(batch)} items)", flush=True)

    print("Creating indexes on 'colleges_reference'...", flush=True)
    collection.create_index([("normalized_college", ASCENDING)], name="idx_normalized_college")
    collection.create_index([("college", TEXT)], name="idx_college_text")

    final_count = collection.count_documents({})
    print(f"Successfully seeded {final_count} colleges into 'colleges_reference'.", flush=True)
    return final_count

if __name__ == "__main__":
    seed_colleges()
