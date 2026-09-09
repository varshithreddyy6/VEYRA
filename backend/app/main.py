"""FastAPI application entrypoint for the CREDIT CARD FRAUD DETECTION SYSTEM.

Wires together configuration, logging, database, security middleware, the
ML model registry (loaded once at startup) and all versioned API routers.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.routes import (
    alerts,
    auth,
    batch,
    health,
    model,
    screen,
    transactions,
)
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.base import Base  # noqa: F401  (ensures models are registered on Base.metadata)
from app.services.model_service import model_service

logger = logging.getLogger("app.main")


def _apply_security_headers(response: JSONResponse | None = None) -> None:
    """Add conservative HTTP security headers to every response."""
    headers = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Referrer-Policy": "no-referrer",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
        "X-XSS-Protection": "0",
    }
    if response is not None:
        response.headers.update(headers)
        return None
    return headers


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info("%s v%s starting (environment=%s)", settings.app_name, __version__, settings.environment)

    if settings.environment != "testing":
        # Load ML artifacts once at startup; both API workers and Celery workers
        # share this registry. If nothing has been trained yet, the registry
        # stays in "unavailable" state and the API surfaces that honestly.
        try:
            model_service.load_or_train_if_ready()
        except Exception:  # pragma: no cover - defensive startup
            logger.exception("Model registry failed to initialise; API will report 'unavailable'")
    else:
        logger.info("Skipping model load (testing environment)")

    yield

    logger.info("Shutting down")


app = FastAPI(
    title=settings.app_name,
    description=(
        "Educational fraud-screening API. Predictions are **decision-support signals only** — "
        "LOW/MEDIUM/HIGH categories are model screening outputs, never automated banking decisions."
    ),
    version=__version__,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Security headers + request ID ──────────────────────────────────────────
@app.middleware("http")
async def security_and_security_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.update(_apply_security_headers() or {})
    request_id = request.headers.get("X-Request-ID")
    if request_id:
        response.headers["X-Request-ID"] = request_id
    return response


# ── Routers ────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(health.router, prefix=API_PREFIX, tags=["health"])
app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["auth"])
app.include_router(screen.router, prefix=f"{API_PREFIX}", tags=["screening"])
app.include_router(batch.router, prefix=f"{API_PREFIX}/batch", tags=["batch"])
app.include_router(transactions.router, prefix=f"{API_PREFIX}/transactions", tags=["transactions"])
app.include_router(model.router, prefix=f"{API_PREFIX}/model", tags=["model"])
app.include_router(alerts.router, prefix=f"{API_PREFIX}/alerts", tags=["alerts"])

# Legacy compatibility endpoint (kept for the README speed-run).
@app.get("/", tags=["health"])
def root() -> dict:
    return {
        "app": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "api": API_PREFIX,
        "time": datetime.now(timezone.utc).isoformat(),
    }
