"""Model info / metrics schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ThresholdInfo(BaseModel):
    value: float
    selected_by: str
    alternatives: dict[str, float] = Field(default_factory=dict)


class ModelInfoOut(BaseModel):
    available: bool
    version: str | None = None
    model_type: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    threshold: ThresholdInfo | None = None
    risk: dict[str, float] = Field(default_factory=dict)
    metrics: dict[str, Any] | None = None
    explainability: bool = False
    message: str | None = None
    disclaimer: str = Field(
        default=(
            "Screening prototype: LOW/MEDIUM/HIGH are model outputs for analyst "
            "review, never automated banking decisions."
        )
    )


class MetricsOut(BaseModel):
    available: bool
    model_version: str | None = None
    metrics: dict[str, Any] | None = None
    baseline: dict[str, Any] | None = None
    threshold: dict[str, Any] | None = None
    dataset: str | None = None
    message: str | None = None
    metric_note: str = Field(
        default=(
            "Metrics are computed on the held-out test split during training. "
            "They describe the trained model on this dataset — not live production traffic."
        )
    )


class AlertOut(BaseModel):
    id: str
    transaction_id: str
    external_ref: str
    amount: float
    occurred_at: datetime
    fraud_probability: float
    prediction: str
    risk_category: str
    rule_flags: list[str] = Field(default_factory=list)
    decided_by_rule: bool = False
    model_version: str | None = None
    decision_threshold: float = 0.5
    created_at: datetime
