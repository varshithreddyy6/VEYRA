"""Fraud alerts: high-risk screenings for the current user.

An alert is any screening with risk_category HIGH (or a rule-decided MEDIUM)
from the last N days. Alerts are informational review queues — the system
never blocks anything on its own.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.dependencies import CurrentUser, DbSession
from app.db.models import Screening, Transaction
from app.schemas.model import AlertOut

router = APIRouter()


def _to_alert(s: Screening, txn: Transaction) -> AlertOut:
    return AlertOut(
        id=s.id,
        transaction_id=txn.id,
        external_ref=txn.external_ref,
        amount=txn.amount,
        occurred_at=txn.occurred_at,
        fraud_probability=s.fraud_probability,
        prediction=s.prediction,
        risk_category=s.risk_category,
        rule_flags=s.rule_flags or [],
        decided_by_rule=s.decided_by_rule,
        model_version=s.model_version,
        decision_threshold=s.decision_threshold,
        created_at=s.created_at,
    )


@router.get("", summary="Recent high-risk alerts for review")
def list_alerts(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    days: int = Query(7, ge=1, le=90),
    include_medium: bool = Query(False, description="Also include rule-flagged MEDIUM screenings"),
) -> dict:
    from app.db.session import engine as db_engine  # noqa: PLC0415

    since = datetime.now(timezone.utc) - timedelta(days=days)
    if db_engine.dialect.name == "sqlite":
        # SQLite stores TIMESTAMP columns naively; compare in the same shape.
        since = since.replace(tzinfo=None)
    conditions = [
        Screening.created_at >= since,
        Transaction.user_id == user.id,
    ]
    if include_medium:
        conditions.append(Screening.risk_category.in_(["HIGH", "MEDIUM"]))
    else:
        conditions.append(Screening.risk_category == "HIGH")

    base = (
        select(Screening, Transaction)
        .join(Transaction, Screening.transaction_id == Transaction.id)
        .where(*conditions)
    )
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(
        base.order_by(Screening.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()

    items = [_to_alert(s, t) for s, t in rows]
    return {
        "items": [i.model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(total / page_size)),
        "window_days": days,
        "note": "Alerts are review queues for analysts; they are not automated banking blocks.",
    }
