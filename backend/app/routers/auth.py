import secrets
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.auth import (
    create_access_token,
    generate_refresh_token,
    get_current_user,
    hash_password,
    to_user_response,
    verify_password,
)
from app.db import get_db
from app.models import AuthResponse, LoginRequest, SignupRequest, UserResponse

router = APIRouter(tags=["auth"])

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def signup(payload: SignupRequest):
    db = get_db()
    hashed_pwd = hash_password(payload.password)
    refresh_tok = generate_refresh_token()
    now_iso = datetime.now(timezone.utc).isoformat()

    role = payload.role or "STUDENT"
    inst_id = payload.institution_id

    if role in ["INSTITUTION_ADMIN", "PLATFORM_ADMIN"]:
        inst_name = (payload.institution_name or "").strip()
        if not inst_name:
            inst_name = f"Institution {secrets.token_hex(3)}"
        
        inst_doc = {
            "name": inst_name,
            "created_at": now_iso,
        }
        inst_res = await db["institutions"].insert_one(inst_doc)
        inst_id = str(inst_res.inserted_id)

    user_doc = {
        "name": payload.name,
        "email": payload.email.lower().strip(),
        "password_hash": hashed_pwd,
        "role": role,
        "institution_id": inst_id,
        "onboarding_completed": False,
        "goal": None,
        "year": None,
        "college": None,
        "refresh_token": refresh_tok,
        "created_at": now_iso,
    }

    try:
        result = await db["users"].insert_one(user_doc)
        user_doc["_id"] = result.inserted_id

        if role in ["INSTITUTION_ADMIN", "PLATFORM_ADMIN"] and inst_id:
            await db["institutions"].update_one(
                {"_id": ObjectId(inst_id)},
                {"$set": {"created_by_admin_id": str(user_doc["_id"])}}
            )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    access_tok = create_access_token(str(user_doc["_id"]))
    user_response = to_user_response(user_doc)

    return AuthResponse(
        access_token=access_tok,
        refresh_token=refresh_tok,
        token_type="bearer",
        user=user_response,
    )

@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest):
    db = get_db()
    normalized_email = payload.email.lower().strip()
    user_doc = await db["users"].find_one({"email": normalized_email})

    if not user_doc or not verify_password(payload.password, user_doc.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_tok = create_access_token(str(user_doc["_id"]))
    refresh_tok = user_doc.get("refresh_token") or generate_refresh_token()

    if not user_doc.get("refresh_token"):
        await db["users"].update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"refresh_token": refresh_tok}}
        )

    user_response = to_user_response(user_doc)

    return AuthResponse(
        access_token=access_tok,
        refresh_token=refresh_tok,
        token_type="bearer",
        user=user_response,
    )

@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def me(current_user: dict = Depends(get_current_user)):
    db = get_db()
    inst_id = current_user.get("institution_id")
    if inst_id and not current_user.get("institution_name") and not current_user.get("college"):
        try:
            inst_doc = await db["institutions"].find_one({"_id": ObjectId(inst_id)})
            if inst_doc:
                current_user["institution_name"] = inst_doc.get("name")
                current_user["college"] = inst_doc.get("name")
        except Exception:
            pass
    return to_user_response(current_user)

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: dict = Depends(get_current_user)):
    return {}

@router.post("/checkin", status_code=status.HTTP_200_OK)
async def checkin(current_user: dict = Depends(get_current_user)):
    db = get_db()
    today_dt = datetime.now(timezone.utc).date()
    today_str = today_dt.strftime("%Y-%m-%d")

    last_active = current_user.get("last_active_date")
    curr_streak = int(current_user.get("current_streak") or current_user.get("streak") or 0)
    long_streak = int(current_user.get("longest_streak") or curr_streak)

    if not last_active:
        new_streak = 1
    else:
        try:
            last_dt = datetime.strptime(last_active, "%Y-%m-%d").date()
            diff = (today_dt - last_dt).days
            if diff == 0:
                new_streak = max(1, curr_streak)
            elif diff == 1:
                new_streak = curr_streak + 1
            else:
                new_streak = 1
        except Exception:
            new_streak = 1

    new_longest = max(long_streak, new_streak)

    await db["users"].update_one(
        {"_id": current_user["_id"]},
        {"$set": {
            "last_active_date": today_str,
            "current_streak": new_streak,
            "longest_streak": new_longest,
            "streak": new_streak
        }}
    )

    if new_streak >= 7:
        from app.rewards import award_achievement_if_not_exists
        await award_achievement_if_not_exists(
            db, str(current_user["_id"]), "streak_7", "Week Warrior", "Achieved a 7-day learning streak", "flame"
        )

    return {"current_streak": new_streak, "longest_streak": new_longest}

