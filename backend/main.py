from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from backend.routes.analytics import router as analytics_router
    from backend.routes.evaluate import router as evaluate_router
    from backend.routes.upload import router as upload_router
except ModuleNotFoundError:
    from routes.analytics import router as analytics_router
    from routes.evaluate import router as evaluate_router
    from routes.upload import router as upload_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EduPilot AI Backend",
    version="1.0.0",
    description="Backend APIs for upload, evaluation, and analytics.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/upload", tags=["upload"])
app.include_router(evaluate_router, prefix="/evaluate", tags=["evaluate"])
app.include_router(analytics_router, prefix="/analytics", tags=["analytics"])


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
