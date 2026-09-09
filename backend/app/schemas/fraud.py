"""Screening request/response schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator, ConfigDict

from app.fraud_detector.utils.schema import (
    CARD_LIKE_RE,
    FeatureValidationError,
    new_external_ref,
    validate_amount,
    validate_features,
)


class ScreenRequest(BaseModel):
    """Single transaction screening payload — anonymized features only."""

    model_config = ConfigDict(str_strip_whitespace=True)

    amount: float = Field(ge=0, le=1_000_000, description="Transaction amount in USD")
    occurred_at: datetime = Field(description="ISO-8601 UTC timestamp")
    features: dict[str, float] = Field(description="Anonymized PCA features V1..V28")
    external_ref: str | None = Field(default=None, max_length=128)
    true_label: int | None = Field(default=None, ge=0, le=1)

    @field_validator("amount")
    @classmethod
    def _amount(cls, v: float) -> float:
        try:
            return validate_amount(v)
        except FeatureValidationError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("occurred_at")
    @classmethod
    def _occurred(cls, v: datetime) -> datetime:
        return v

    @field_validator("features")
    @classmethod
    def _features(cls, v: dict[str, float]) -> dict[str, float]:
        try:
            return validate_features(v)
        except FeatureValidationError as exc:
            raise ValueError(str(exc)) from exc

    @field_validator("external_ref")
    @classmethod
    def _ref(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not v.strip():
            return None
        if CARD_LIKE_RE.match(v):
            raise ValueError(
                "Raw card numbers are not accepted. This system only processes anonymized "
                "PCA features (V1..V28), Amount and Time."
            )
        return v.strip()

    def apply_defaults(self) -> "ScreenRequest":
        if self.external_ref is None:
            self.external_ref = new_external_ref()
        return self


class ShapContribution(BaseModel):
    feature: str
    value: float
    shap_value: float
    direction: str
    magnitude: float


class ExplanationOut(BaseModel):
    available: bool
    method: str | None = None
    model_version: str | None = None
    base_value: float | None = None
    predicted_probability: float | None = None
    human_readable: str | None = None
    contributions: list[ShapContribution] = Field(default_factory=list)
    feature_columns: list[str] = Field(default_factory=list)
    note: str = Field(
        default="SHAP values explain the model output; they are not evidence of causation."
    )


class RuleFlagOut(BaseModel):
    rule: str
    human_readable: str


class ScreenResponse(BaseModel):
    screening_id: str
    transaction_id: str
    external_ref: str
    occurred_at: datetime
    amount: float
    fraud_probability: float
    prediction: str  # fraud | legit
    risk_category: str  # LOW | MEDIUM | HIGH
    decision_threshold: float
    threshold_selected_by: str
    model_version: str | None
    risk_bands: dict[str, float]
    decided_by_rule: bool
    rule_flags: list[RuleFlagOut] = Field(default_factory=list)
    explanation: ExplanationOut
    created_at: datetime
    disclaimer: str = Field(
        default=(
            "Risk categories are model screening outputs. This prototype "
            "provides decision-support signals only and never blocks or "
            "approves real transactions."
        )
    )


class ModelUnavailableResponse(BaseModel):
    detail: str
    available: bool = False
    hint: str = "Run `cd backend && python train_model.py` to train the model."
