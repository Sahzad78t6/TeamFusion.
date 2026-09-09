from contextlib import asynccontextmanager
import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import close_db, init_db
from app.routers.auth import router as auth_router
from app.routers.onboarding import router as onboarding_router
from app.routers.recommendation import router as recommendation_router
from app.routers.dashboard import router as dashboard_router
from app.routers.planner import router as planner_router
from app.routers.institutions import router as institutions_router
from app.routers.contests import router as contests_router
from app.routers.curriculum import router as curriculum_router
from app.routers.learning import router as learning_router
from app.routers.profile import router as profile_router
from app.routers.push import router as push_router
from app.services.inactivity_job import check_inactive_users
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("growthos.main")

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GrowthOS backend...")
    await init_db()
    try:
        scheduler.add_job(check_inactive_users, 'interval', hours=24)
        scheduler.start()
        logger.info("APScheduler started for inactivity push notifications.")
    except Exception as exc:
        logger.warning(f"Failed to start APScheduler: {exc}")
    yield
    logger.info("Shutting down GrowthOS backend...")
    try:
        scheduler.shutdown(wait=False)
    except Exception:
        pass
    await close_db()

app = FastAPI(
    title="GrowthOS Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS — includes all known frontend origins
_allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://team-fusion-ipx2.vercel.app",
    "https://team-fusion-ipx2.vercel.app/",
]
# Allow injecting extra origin via Render env var (FRONTEND_URL)
_env_frontend = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
if _env_frontend and _env_frontend not in _allowed_origins:
    _allowed_origins.append(_env_frontend)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers - no /api prefix
app.include_router(auth_router, prefix="/auth")
app.include_router(onboarding_router)
app.include_router(curriculum_router)
app.include_router(recommendation_router)
app.include_router(dashboard_router)
app.include_router(planner_router)
app.include_router(institutions_router, prefix="/institutions")
app.include_router(contests_router)
app.include_router(learning_router)
app.include_router(profile_router)
app.include_router(push_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "growthos-backend"}
