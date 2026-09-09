"""Feature validation shared by the training pipeline and the API.

Anything that claims to be a card transaction must be *anonymized features*
only. Real card numbers, CVVs, names and merchants are rejected outright —
the system is deliberately structured so it cannot ingest them.
"""
from __future__ import annotations

import math
import re
import uuid
from datetime import datetime

from app.fraud_detector.config import PRINCIPAL_FEATURES

# Real-world bounds for sanity checks (generous on purpose, still protective).
MAX_AMOUNT = 1_000_000.0
MAX_ABS_PRINCIPAL = 100.0  # PCA components of this dataset are small; anything huge is malformed

CARD_LIKE_RE = re.compile(r"^\s*\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\s*$")

FEATURE_COLUMNS = PRINCIPAL_FEATURES  # V1..V28 (Time/Amount handled separately)


class FeatureValidationError(ValueError):
    """Raised when a transaction payload fails validation. Message is safe to show."""


def _reject_card_like(value: object) -> None:
    if isinstance(value, str) and CARD_LIKE_RE.match(value):
        raise FeatureValidationError(
            "Raw card numbers are not accepted. This system only processes anonymized "
            "PCA features (V1..V28), Amount and Time."
        )


def validate_amount(amount: object) -> float:
    if isinstance(amount, bool) or not isinstance(amount, (int, float)):
        raise FeatureValidationError("Amount must be a number")
    if not math.isfinite(float(amount)):
        raise FeatureValidationError("Amount must be finite")
    amt = float(amount)
    if amt < 0 or amt > MAX_AMOUNT:
        raise FeatureValidationError(f"Amount must be between 0 and {MAX_AMOUNT:,.0f}")
    return round(amt, 2)


def validate_occurred_at(value: object) -> datetime:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        raise FeatureValidationError("Occurred_at must be an ISO-8601 datetime string")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise FeatureValidationError("Occurred_at must be an ISO-8601 datetime string") from None


def validate_features(features: dict) -> dict[str, float]:
    """Validate a V1..V28 feature dict. Raises FeatureValidationError."""
    if not isinstance(features, dict):
        raise FeatureValidationError("Features must be an object mapping V1..V28 to numbers")

    unknown = set(features) - set(FEATURE_COLUMNS)
    if unknown:
        unknown_str = sorted(unknown)[:5]
        raise FeatureValidationError(f"Unknown feature names: {unknown_str}")

    missing = [c for c in FEATURE_COLUMNS if c not in features]
    if missing:
        raise FeatureValidationError(f"Missing feature(s): {missing}")

    cleaned: dict[str, float] = {}
    for name in FEATURE_COLUMNS:
        raw = features[name]
        if isinstance(raw, bool) or not isinstance(raw, (int, float)):
            raise FeatureValidationError(f"Feature {name} must be a number")
        val = float(raw)
        if not math.isfinite(val):
            raise FeatureValidationError(f"Feature {name} must be finite (NaN/inf rejected)")
        if abs(val) > MAX_ABS_PRINCIPAL:
            raise FeatureValidationError(f"Feature {name} is out of plausible range")
        cleaned[name] = val
    return cleaned


def validate_optional_fields(external_ref: object, true_label: object) -> tuple[str | None, int | None]:
    ref = None
    if external_ref is not None:
        s = str(external_ref).strip()
        if not s or len(s) > 128:
            raise FeatureValidationError("External reference must be 1-128 characters")
        _reject_card_like(s)
        ref = s
    label = None
    if true_label is not None:
        if isinstance(true_label, bool) or int(true_label) not in (0, 1):
            raise FeatureValidationError("True label must be 0 or 1")
        label = int(true_label)
    return ref, label


def new_external_ref() -> str:
    """Helper producing a collision-free screening reference."""
    return uuid.uuid4().hex[:16]
