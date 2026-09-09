"""SQLAlchemy engine/session factory.

Uses ``create_engine`` with pool pre-ping so PostgreSQL restarts during local
dev do not poison sessions. In tests, ``app.db.session`` is monkeypatched to
an in-memory SQLite engine (see tests/conftest.py).
"""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_is_sqlite = settings.database_url.startswith("sqlite")

engine = create_engine(
    settings.database_url,
    echo=False,
    future=True,
    pool_pre_ping=not _is_sqlite,
    connect_args={"check_same_thread": False, "timeout": 30} if _is_sqlite else {},
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    """Dependency-compatible generator; used by background tasks too."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
