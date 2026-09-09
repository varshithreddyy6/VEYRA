"""SQLAlchemy 2.x ORM models.

Design notes
------------
* ``users`` — accounts with role-based access control (analyst / admin).
* ``transactions`` — screening subjects. Feature vectors are stored as JSONB
  (Postgres) / JSON (SQLite). Only anonymized features are ever accepted.
* ``screenings`` — one row per model screening: probability, threshold used,
  prediction, risk category, SHAP values, triggered rule flags.
* ``batch_jobs`` — CSV batch upload jobs processed by Celery.
* ``audit_logs`` — append-only trail of meaningful actions.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _json_type():
    """JSONB on PostgreSQL, JSON elsewhere (SQLite tests)."""
    return JSONB().with_variant(JSON(), "sqlite")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="analyst")  # analyst | admin
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    transactions: Mapped[list["Transaction"]] = relationship(back_populates="owner")
    batch_jobs: Mapped[list["BatchJob"]] = relationship(back_populates="owner")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    external_ref: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    features: Mapped[dict[str, Any]] = mapped_column(_json_type(), nullable=False)
    true_label: Mapped[int | None] = mapped_column(Integer, nullable=True)  # None = unknown
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    owner: Mapped["User"] = relationship(back_populates="transactions")
    screenings: Mapped[list["Screening"]] = relationship(back_populates="transaction")

    __table_args__ = (UniqueConstraint("user_id", "external_ref", name="uq_transactions_user_ref"),)


class Screening(Base):
    __tablename__ = "screenings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    transaction_id: Mapped[str] = mapped_column(ForeignKey("transactions.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    model_version: Mapped[str] = mapped_column(String(64), nullable=False)
    fraud_probability: Mapped[float] = mapped_column(Float, nullable=False)
    decision_threshold: Mapped[float] = mapped_column(Float, nullable=False)
    prediction: Mapped[str] = mapped_column(String(10), nullable=False)  # fraud | legit
    risk_category: Mapped[str] = mapped_column(String(10), index=True, nullable=False)  # LOW | MEDIUM | HIGH
    shap_explanation: Mapped[dict[str, Any]] = mapped_column(_json_type(), nullable=False, default=dict)
    rule_flags: Mapped[list[str]] = mapped_column(_json_type(), nullable=False, default=list)
    decided_by_rule: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)

    transaction: Mapped["Transaction"] = relationship(back_populates="screenings")
    user: Mapped["User | None"] = relationship()


class BatchJob(Base):
    __tablename__ = "batch_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    # queued | processing | done | failed
    total_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    processed_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    flagged_rows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    result_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    preview: Mapped[dict[str, Any] | None] = mapped_column(_json_type(), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="batch_jobs")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(_json_type(), nullable=False, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now)
