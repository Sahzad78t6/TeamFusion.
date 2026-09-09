from contextlib import asynccontextmanager
import logging
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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("growthos.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting GrowthOS backend...")
    await init_db()
    yield
    logger.info("Shutting down GrowthOS backend...")
    await close_db()

app = FastAPI(
    title="GrowthOS Backend",
    version="2.0.0",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "growthos-backend"}
