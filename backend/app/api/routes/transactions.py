"""Transaction history endpoints (list, detail, local explanation)."""
from __future__ import annotations

import math

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, DbSession
from app.db.models import Screening, Transaction
from app.schemas.fraud import ExplanationOut
from app.schemas.transaction import (
    PaginatedTransactions,
    ScreeningSummary,
    TransactionDetailOut,
    TransactionOut,
)
from app.services.model_service import model_service

router = APIRouter()

RISK_VALUES = {"LOW", "MEDIUM", "HIGH"}
PREDICTION_VALUES = {"fraud", "legit"}
SORTABLE = {"amount", "occurred_at", "created_at", "fraud_probability", "risk_category", "prediction"}


def _latest_screening(stmt):
    return (
        select(Screening)
        .where(Screening.transaction_id == Transaction.id)
        .order_by(Screening.created_at.desc())
        .limit(1)
    )


@router.get("", response_model=PaginatedTransactions, summary="List my transactions")
def list_transactions(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    risk: str | None = Query(None, pattern="^(LOW|MEDIUM|HIGH)$"),
    prediction: str | None = Query(None, pattern="^(fraud|legit)$"),
    q: str | None = Query(None, max_length=128, description="Search external_ref"),
    date_from: str | None = Query(None, description="ISO date (inclusive)"),
    date_to: str | None = Query(None, description="ISO date (inclusive)"),
    sort: str = Query("occurred_at", pattern="|".join(SORTABLE)),
    order: str = Query("desc", pattern="^(asc|desc)$"),
) -> PaginatedTransactions:
    base = select(Transaction).where(Transaction.user_id == user.id)

    if risk:
        base = base.join(Screening).where(Screening.risk_category == risk).distinct()
    if prediction:
        base = base.join(Screening).where(Screening.prediction == prediction).distinct()
    if q:
        base = base.where(Transaction.external_ref.ilike(f"%{q}%"))
    if date_from:
        base = base.where(Transaction.occurred_at >= f"{date_from}T00:00:00")
    if date_to:
        base = base.where(Transaction.occurred_at <= f"{date_to}T23:59:59")

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    sort_col = getattr(Transaction, sort, Transaction.occurred_at)
    order_fn = desc if order == "desc" else asc
    rows = db.execute(
        base.order_by(order_fn(sort_col)).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()

    items: list[TransactionOut] = []
    for txn in rows:
        latest = db.execute(
            select(Screening)
            .where(Screening.transaction_id == txn.id)
            .order_by(Screening.created_at.desc())
            .limit(1)
        ).scalar_one_or_none()
        out = TransactionOut.model_validate(txn)
        out.features = {k: round(v, 6) for k, v in (txn.features or {}).items()}
        if latest:
            out.latest_screening = ScreeningSummary(
                id=latest.id,
                fraud_probability=latest.fraud_probability,
                prediction=latest.prediction,
                risk_category=latest.risk_category,
                decision_threshold=latest.decision_threshold,
                model_version=latest.model_version,
                rule_flags=latest.rule_flags or [],
                decided_by_rule=latest.decided_by_rule,
                created_at=latest.created_at,
            )
        items.append(out)

    return PaginatedTransactions(
        items=items, total=total, page=page, page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/summary", summary="Dashboard statistics (KPIs, risk mix, 7-day trend)")
def summary(user: CurrentUser, db: DbSession) -> dict:
    """Aggregations over the current user's screenings.

    Per-transaction figures use each transaction's MOST RECENT screening.
    The trend bucket is the screening day (UTC) over the last 7 days.
    """
    total = db.execute(
        select(func.count()).select_from(Transaction).where(Transaction.user_id == user.id)
    ).scalar_one()

    rows = db.execute(
        select(Screening.id, Screening.transaction_id, Screening.risk_category,
               Screening.prediction, Screening.fraud_probability, Screening.created_at)
        .join(Transaction, Screening.transaction_id == Transaction.id)
        .where(Transaction.user_id == user.id)
        .order_by(Screening.created_at.desc())
        .limit(10_000)
    ).all()

    # Latest screening per transaction (rows arrive newest-first)
    latest: dict[str, Screening] = {}
    for row in rows:
        latest.setdefault(row.transaction_id, row)

    assessed = list(latest.values())
    fraud_count = sum(1 for s in assessed if s.prediction == "fraud")
    rotation = total or 1
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for s in assessed:
        risk_dist[s.risk_category] = risk_dist.get(s.risk_category, 0) + 1

    from datetime import datetime, timedelta, timezone  # noqa: PLC0415

    today = datetime.now(timezone.utc).date()
    trend: list[dict] = []
    # Recent screenings may fall outside the 7-day window bucket labels by day.
    day_counts: dict[str, int] = {}
    day_fraud: dict[str, int] = {}
    for s in rows:
        day = s.created_at.date().isoformat()
        day_counts[day] = day_counts.get(day, 0) + 1
        if s.prediction == "fraud":
            day_fraud[day] = day_fraud.get(day, 0) + 1
    for offset in range(6, -1, -1):
        day = (today - timedelta(days=offset)).isoformat()
        trend.append({"day": day, "screenings": day_counts.get(day, 0), "fraud": day_fraud.get(day, 0)})

    return {
        "total_transactions": int(total),
        "assessed_transactions": int(len(assessed)),
        "fraud_count": int(fraud_count),
        "legit_count": int(len(assessed) - fraud_count),
        "detection_rate": float(fraud_count / rotation),
        "detection_rate_note": "share of transactions whose latest screening predicted fraud (unlabeled ground truth)",
        "risk_distribution": risk_dist,
        "trend": trend,
        "window_label": "last 7 days (screening activity)",
    }


@router.get("/{transaction_id}", response_model=TransactionDetailOut, summary="Transaction detail")
def get_transaction(transaction_id: str, user: CurrentUser, db: DbSession) -> TransactionDetailOut:
    txn = db.execute(
        select(Transaction)
        .options(selectinload(Transaction.screenings))
        .where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    ).scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    out = TransactionDetailOut.model_validate(txn)
    out.features = {k: round(v, 6) for k, v in (txn.features or {}).items()}
    out.screenings = [
        ScreeningSummary(
            id=s.id, fraud_probability=s.fraud_probability, prediction=s.prediction,
            risk_category=s.risk_category, decision_threshold=s.decision_threshold,
            model_version=s.model_version, rule_flags=s.rule_flags or [],
            decided_by_rule=s.decided_by_rule, created_at=s.created_at,
        )
        for s in sorted(txn.screenings, key=lambda s: s.created_at, reverse=True)
    ]
    return out


@router.get("/{transaction_id}/explanation", response_model=ExplanationOut,
            summary="Recompute the local SHAP explanation for a stored transaction")
def transaction_explanation(transaction_id: str, user: CurrentUser, db: DbSession) -> ExplanationOut:
    txn = db.execute(
        select(Transaction).where(Transaction.id == transaction_id, Transaction.user_id == user.id)
    ).scalar_one_or_none()
    if txn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    # Stored features are the V1..V28 dict; derive the hour-of-day from the
    # transaction's UTC timestamp (same convention as the screening pipeline).
    hour = float(txn.occurred_at.hour)

    try:
        expl = model_service.explain(txn.features or {}, txn.amount, hour)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return ExplanationOut(**expl)
