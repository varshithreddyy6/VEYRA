"""Validation/adjudication logic: risk bands, feature validation, card rejection."""
from __future__ import annotations

import math

import pytest

from app.fraud_detector.config import RISK_CONFIG, RiskConfig
from app.fraud_detector.utils.schema import (
    FeatureValidationError,
    validate_amount,
    validate_features,
    validate_occurred_at,
    validate_optional_fields,
)


def test_risk_band_boundaries():
    rc = RiskConfig(low_cut=0.30, high_cut=0.70)
    assert rc.categorize(0.05) == "LOW"
    assert rc.categorize(0.2999) == "LOW"
    assert rc.categorize(0.30) == "MEDIUM"
    assert rc.categorize(0.6999) == "MEDIUM"
    assert rc.categorize(0.70) == "HIGH"
    assert rc.categorize(1.0) == "HIGH"


def test_default_risk_bands_are_reasonable():
    d = RISK_CONFIG.as_dict()
    assert 0 < d["low_cut"] < d["high_cut"] < 1


def test_validate_amount_accepts_and_rounds():
    assert validate_amount(2481.90) == pytest.approx(2481.9)
    assert validate_amount(0) == 0.0
    assert validate_amount(12.345) == pytest.approx(12.35)


def test_validate_amount_rejects_bad_values():
    with pytest.raises(FeatureValidationError):
        validate_amount(-1)
    with pytest.raises(FeatureValidationError):
        validate_amount(1_000_001)
    with pytest.raises(FeatureValidationError):
        validate_amount(math.inf)
    with pytest.raises(FeatureValidationError):
        validate_amount(math.nan)
    with pytest.raises(FeatureValidationError):
        validate_amount("not-a-number")


def test_validate_features_requires_all_28():
    good = {f"V{i}": 0.1 for i in range(1, 29)}
    cleaned = validate_features(good)
    assert len(cleaned) == 28
    with pytest.raises(FeatureValidationError):
        validate_features({"V1": 0.1})
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V29": 0.1})
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "Amount": 10})


def test_validate_features_rejects_non_finite_and_bool():
    good = {f"V{i}": 0.1 for i in range(1, 29)}
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V5": math.nan})
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V5": math.inf})
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V5": True})
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V5": "oops"})


def test_validate_features_rejects_out_of_range():
    good = {f"V{i}": 0.1 for i in range(1, 29)}
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V7": 500.0})


def test_card_numbers_are_rejected():
    good = {f"V{i}": 0.1 for i in range(1, 29)}
    with pytest.raises(FeatureValidationError):
        validate_optional_fields("4111 1111 1111 1111", None)
    with pytest.raises(FeatureValidationError):
        validate_optional_fields("4111111111111111", None)
    # The schema rejects them even inside the feature dict (defense in depth).
    with pytest.raises(FeatureValidationError):
        validate_features({**good, "V1": "4111 1111 1111 1111"})


def test_optional_fields_validation():
    ref, label = validate_optional_fields("ref-1", 1)
    assert (ref, label) == ("ref-1", 1)
    ref, label = validate_optional_fields(None, None)
    assert (ref, label) == (None, None)
    with pytest.raises(FeatureValidationError):
        validate_optional_fields("x" * 200, None)
    with pytest.raises(FeatureValidationError):
        validate_optional_fields(None, 7)


def test_occurred_at_parsing():
    from datetime import datetime, timezone

    parsed = validate_occurred_at("2026-01-15T10:30:00Z")
    assert parsed.tzinfo is not None
    assert isinstance(validate_occurred_at(datetime(2026, 1, 15, 10, 30, tzinfo=timezone.utc)), datetime)
    with pytest.raises(FeatureValidationError):
        validate_occurred_at("not-a-date")
