"""Health endpoints (unauthenticated, minimal surface)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter
from sqlalchemy import text

from app import __version__
from app.core.config import settings
from app.db.session import engine
from app.services.model_registry import registry
from app.services.rate_limit import rate_limiter

router = APIRouter()


def _db_status() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "up"}
    except Exception as exc:
        return {"status": "down", "error": str(exc)[:200]}


@router.get("/health", summary="Liveness + readiness")
def health() -> dict:
    model = registry.resolve()
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": __version__,
        "time": datetime.now(timezone.utc).isoformat(),
        "database": _db_status(),
        "redis_backend": rate_limiter.backend,
        "model": {
            "available": bool(model and model.loaded),
            "version": model.version if model and model.loaded else None,
        },
        "environment": settings.environment,
    }
