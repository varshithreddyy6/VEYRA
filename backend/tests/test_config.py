"""Settings tests: relative SQLite URLs must anchor to the repository root.

Regression guard for the classic dev failure where the API and Alembic
create two different SQLite files (repo-root CWD vs backend/ CWD), which
makes the users table invisible and breaks login/registration.
"""
from __future__ import annotations

from pathlib import Path

from app.core.config import Settings, PROJECT_ROOT


def test_relative_sqlite_url_is_anchored_to_project_root():
    s = Settings(database_url="sqlite:///./ccdfs-dev.db")
    assert s.database_url == f"sqlite:///{(PROJECT_ROOT / 'ccdfs-dev.db').resolve()}"


def test_subdir_relative_sqlite_url_is_anchored():
    s = Settings(database_url="sqlite:///data/dev.db")
    assert s.database_url == f"sqlite:///{(PROJECT_ROOT / 'data' / 'dev.db').resolve()}"


def test_absolute_sqlite_url_is_untouched():
    s = Settings(database_url="sqlite:////tmp/somewhere/dev.db")
    assert s.database_url == "sqlite:////tmp/somewhere/dev.db"


def test_in_memory_sqlite_is_untouched():
    s = Settings(database_url="sqlite://")
    assert s.database_url == "sqlite://"
    s2 = Settings(database_url="sqlite:///:memory:")
    assert s2.database_url == "sqlite:///:memory:"


def test_postgres_url_is_untouched():
    url = "postgresql+psycopg://fraud:pw@localhost:5432/fraud_detector"
    s = Settings(database_url=url)
    assert s.database_url == url


def test_configured_origins_are_split_into_a_list():
    s = Settings(cors_origins="http://localhost:5173,http://127.0.0.1:5173")
    assert s.cors_origins_list == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_project_root_is_repository_root():
    """PROJECT_ROOT must be the repo root so the repo-level .env is loaded.

    Regression guard: it used to resolve to backend/, silently ignoring
    DATABASE_URL / JWT_SECRET / CORS_ORIGINS from the repository .env.
    """
    from app.core.config import PROJECT_ROOT

    assert (PROJECT_ROOT / "backend").is_dir()
    assert (PROJECT_ROOT / "frontend").is_dir()
    assert (PROJECT_ROOT / ".env.example").is_file()
