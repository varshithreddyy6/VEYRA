"""Transaction list/detail schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ScreeningSummary(BaseModel):
    id: str
    fraud_probability: float
    prediction: str
    risk_category: str
    decision_threshold: float
    model_version: str | None = None
    rule_flags: list[str] = Field(default_factory=list)
    decided_by_rule: bool = False
    created_at: datetime
    model_config = {"from_attributes": True}


class TransactionOut(BaseModel):
    id: str
    external_ref: str
    amount: float
    occurred_at: datetime
    true_label: int | None = None
    created_at: datetime
    features: dict[str, float] = Field(default_factory=dict)
    latest_screening: ScreeningSummary | None = None
    model_config = {"from_attributes": True}


class TransactionDetailOut(TransactionOut):
    screenings: list[ScreeningSummary] = Field(default_factory=list)


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    total: int
    page: int
    page_size: int
    pages: int
