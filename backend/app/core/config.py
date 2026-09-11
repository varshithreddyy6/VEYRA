"""Application settings loaded from environment variables / `.env`.

Everything here is environment-driven so the same code runs locally, in
docker-compose and in CI. `database_url` and `redis_url` are overridden
inside the containers to point at the compose services.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repository root = three levels above this file: backend/app/core/config.py
PROJECT_ROOT = Path(__file__).resolve().parents[3]

# .env lives at the repository root (docker-compose reads it too).
_ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    app_name: str = Field(default="Credit Card Fraud Detection System")
    environment: str = Field(default="development")
    debug: bool = Field(default=False)

    # ── Security ───────────────────────────────────────────────────────────
    jwt_secret: str = Field(default="dev-secret-change-me")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_ttl_min: int = Field(default=30)
    jwt_refresh_ttl_days: int = Field(default=7)

    # ── Database / queue ───────────────────────────────────────────────────
    database_url: str = Field(
        default="postgresql+psycopg://fraud:fraud_dev_password@localhost:5432/fraud_detector"
    )
    redis_url: str = Field(default="redis://localhost:6379/0")

    @field_validator("database_url")
    @classmethod
    def _anchor_sqlite_path(cls, v: str) -> str:
        """Fix a classic dev trap: relative SQLite URLs.

        `uvicorn app.main:app --app-dir backend` runs with CWD = repo root,
        while `cd backend && alembic upgrade head` runs with CWD = backend/.
        A URL like ``sqlite:///./dev.db`` therefore creates TWO different
        database files, so the API can't see the migrated tables and every
        auth request fails ("no such table: users"). Anchoring relative SQLite
        paths to the repository root makes the API and Alembic always agree.
        """
        prefix = "sqlite:///"
        if not v.startswith(prefix):
            return v
        rest = v[len(prefix):]
        if rest == "" or rest.startswith(":") or rest.startswith("/"):
            return v  # in-memory or already absolute — leave untouched
        return f"{prefix}{(PROJECT_ROOT / rest).resolve()}"

    # ── CORS ───────────────────────────────────────────────────────────────
    cors_origins: str = Field(default="http://localhost:5173,http://127.0.0.1:5173")

    # ── Model / cost configuration ─────────────────────────────────────────
    fp_cost: float = Field(default=1.0, gt=0)
    fn_cost: float = Field(default=5.0, gt=0)
    model_version: str = Field(default="")  # empty = newest artifact wins

    # ── Rate limiting ──────────────────────────────────────────────────────
    rate_limit_screen_per_minute: int = Field(default=60)
    rate_limit_login_per_minute: int = Field(default=20)

    # ── Uploads ────────────────────────────────────────────────────────────
    max_upload_mb: int = Field(default=20)
    batch_chunk_size: int = Field(default=500)

    # ── Paths (relative to repository root) ────────────────────────────────
    data_dir: Path = Field(default=PROJECT_ROOT / "data")
    artifacts_dir: Path = Field(default=PROJECT_ROOT / "artifacts")
    results_dir: Path = Field(default=PROJECT_ROOT / "results")
    frontend_dist_dir: Path = Field(default=PROJECT_ROOT / "frontend" / "dist")

    # ── Derived helpers ────────────────────────────────────────────────────
    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return v.replace(";", ",")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_testing(self) -> bool:
        return self.environment == "testing"

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def token_hint(self) -> str:
        return self.jwt_algorithm + " (HS256 in dev; use RS256/ES256 in production)"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
