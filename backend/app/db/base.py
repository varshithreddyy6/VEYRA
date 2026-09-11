"""SQLAlchemy base + metadata.

Importing this module registers every model with ``Base.metadata`` so that
Alembic autogenerate and ``create_all`` (tests) see the full schema.
"""
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import models so they attach to Base.metadata (SQLAlchemy 2 requires this).
from app.db import models  # noqa: E402,F401
