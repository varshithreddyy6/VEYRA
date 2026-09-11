"""Single-transaction screening orchestration.

Combines: rule engine flags + ML probability + threshold + risk category +
SHAP explanation, then persists the screening record (transaction +
screening) and returns the API payload.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Screening, Transaction, User
from app.services.audit import audit
from app.services.model_service import model_service
from app.services.rule_engine import RuleEngine

logger = logging.getLogger("app.scoring")


def screen_transaction(
    db: Session,
    user: User,
    *,
    amount: float,
    occurred_at: datetime,
    features: dict,
    external_ref: str | None,
    true_label: int | None,
    ip_address: str | None = None,
) -> dict:
    """Run the full screening pipeline and persist it. Raises RuntimeError
    when no model is available (callers translate to HTTP 503)."""

    # ── History for velocity rules (same external ref, last 24h) ───────────
    previous: list[datetime] = []
    if external_ref:
        rows = db.execute(
            select(Transaction.occurred_at)
            .where(Transaction.external_ref == external_ref)
            .order_by(Transaction.occurred_at.desc())
            .limit(50)
        ).scalars().all()
        previous = list(rows)

    rule_engine = RuleEngine()
    time_hour = occurred_at.astimezone(timezone.utc).hour
    flags = rule_engine.evaluate_transaction(amount, occurred_at, external_ref, previous)

    # ── Model inference ────────────────────────────────────────────────────
    result = model_service.predict(features, amount, time_hour=time_hour)
    explanation = model_service.explain(features, amount, time_hour=time_hour)

    prediction = result["prediction"]
    # Rule override policy: a HIGH amount anomaly never downgrades a model
    # call, and a night+amount flag promotes a MEDIUM to HIGH for review.
    decided_by_rule = False
    if any(f["rule"] in ("amount_anomaly", "night_high_amount") for f in flags):
        if prediction == "legit" and result["risk_category"] != "HIGH":
            result["risk_category"] = "MEDIUM"
            decided_by_rule = True
        elif prediction == "fraud" and result["risk_category"] == "MEDIUM":
            result["risk_category"] = "HIGH"
            decided_by_rule = True

    # ── Persistence ────────────────────────────────────────────────────────
    transaction = Transaction(
        user_id=user.id,
        external_ref=external_ref or f"auto-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}",
        amount=amount,
        occurred_at=occurred_at,
        features=features,
        true_label=true_label,
    )
    db.add(transaction)
    db.flush()

    screening = Screening(
        transaction_id=transaction.id,
        user_id=user.id,
        model_version=result["model_version"],
        fraud_probability=result["fraud_probability"],
        decision_threshold=result["decision_threshold"],
        prediction=prediction,
        risk_category=result["risk_category"],
        shap_explanation={
            "available": explanation.get("available", False),
            "base_value": explanation.get("base_value"),
            "predicted_probability": explanation.get("predicted_probability"),
            "human_readable": explanation.get("human_readable"),
            "contributions": explanation.get("contributions", []),
        },
        rule_flags=[f["rule"] for f in flags],
        decided_by_rule=decided_by_rule,
    )
    db.add(screening)
    db.commit()
    db.refresh(transaction)
    db.refresh(screening)

    audit(db, user=user, action="screen.transaction", entity_type="screening", entity_id=screening.id,
          metadata_json={"transaction_id": transaction.id, "risk": screening.risk_category,
                         "probability": screening.fraud_probability},
          ip_address=ip_address)

    return {
        "screening_id": screening.id,
        "transaction_id": transaction.id,
        "external_ref": transaction.external_ref,
        "occurred_at": occurred_at.isoformat(),
        "amount": amount,
        "fraud_probability": result["fraud_probability"],
        "prediction": prediction,
        "risk_category": result["risk_category"],
        "decision_threshold": result["decision_threshold"],
        "threshold_selected_by": result["threshold_selected_by"],
        "model_version": result["model_version"],
        "risk_bands": result["risk_bands"],
        "decided_by_rule": decided_by_rule,
        "rule_flags": flags,
        "explanation": explanation,
        "created_at": screening.created_at.isoformat(),
    }
