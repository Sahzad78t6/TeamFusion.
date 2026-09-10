import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from app.config import settings

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

async def seed_institution_admins():
    print(f"Connecting to MongoDB at {settings.MONGO_URI} (db: {settings.DB_NAME})...", flush=True)
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.DB_NAME]
    now_iso = datetime.now(timezone.utc).isoformat()

    institutions_data = [
        {
            "name": "Delhi Institute of Management & Technology",
            "full_name": "DELHI INSTITUTE OF MANAGEMENT & TECHNOLOGY VILL.KAKRA, RAWLI ROAD, MURAD NAGAR, GHAZIABAD (Id: C-29070)",
            "admin_name": "DIMT Admin",
            "email": "dimt.admin@growthos.com",
            "password": "DimtAdmin@2026",
            "district": "Ghaziabad",
            "state": "Uttar Pradesh"
        },
        {
            "name": "Vignan's Engineering College, Vadlamudi",
            "full_name": "Vignan's Engineering College, Vadlamudi (V),PIN - 522213(CC-39) (Id: C-18047)",
            "admin_name": "Vignan Admin",
            "email": "vignan.admin@growthos.com",
            "password": "VignanAdmin@2026",
            "district": "Guntur",
            "state": "Andhra Pradesh"
        }
    ]

    for item in institutions_data:
        email = item["email"].lower().strip()
        
        # 1. Upsert institution document with clean name
        inst_doc = await db["institutions"].find_one({"normalized_name": item["name"].lower().strip()})
        if not inst_doc:
            inst_res = await db["institutions"].insert_one({
                "name": item["name"],
                "full_name": item["full_name"],
                "normalized_name": item["name"].lower().strip(),
                "created_at": now_iso
            })
            inst_id = str(inst_res.inserted_id)
        else:
            inst_id = str(inst_doc["_id"])

        # 2. Also insert/update exact full name record in institutions for exact match lookup
        full_norm = item["full_name"].lower().strip()
        if full_norm != item["name"].lower().strip():
            alt_doc = await db["institutions"].find_one({"normalized_name": full_norm})
            if not alt_doc:
                await db["institutions"].insert_one({
                    "name": item["full_name"],
                    "parent_inst_id": inst_id,
                    "normalized_name": full_norm,
                    "created_at": now_iso
                })

        # 3. Upsert INSTITUTION_ADMIN user in users collection
        existing_user = await db["users"].find_one({"email": email})
        hashed_pwd = hash_password(item["password"])

        user_data = {
            "name": item["admin_name"],
            "email": email,
            "password_hash": hashed_pwd,
            "role": "INSTITUTION_ADMIN",
            "institution_id": inst_id,
            "institution_name": item["name"],
            "college": item["name"],
            "onboarding_completed": True,
            "created_at": now_iso
        }

        if existing_user:
            await db["users"].update_one({"_id": existing_user["_id"]}, {"$set": user_data})
            user_id = str(existing_user["_id"])
        else:
            res = await db["users"].insert_one(user_data)
            user_id = str(res.inserted_id)

        await db["institutions"].update_one(
            {"_id": ObjectId(inst_id)},
            {"$set": {"created_by_admin_id": user_id}}
        )

        print(f"SUCCESS: Admin Account: {email} | Password: {item['password']} | Institution: {item['name']} | ID: {inst_id}", flush=True)

if __name__ == "__main__":
    asyncio.run(seed_institution_admins())
