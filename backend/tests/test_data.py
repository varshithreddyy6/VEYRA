"""Dataset validation and quality-check tests (synthetic data for hermeticity)."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.fraud_detector.config import RAW_COLUMNS, TARGET
from app.fraud_detector.data.quality import (
    assess_quality,
    validate_dtypes,
    validate_schema,
    validate_target,
)
from app.fraud_detector.utils.synthetic import generate_synthetic


@pytest.fixture(scope="module")
def df() -> pd.DataFrame:
    return generate_synthetic(n_rows=6000, fraud_rate=0.01, seed=7)


def test_generated_schema_matches_requirements(df):
    assert set(df.columns) == set(RAW_COLUMNS)
    assert validate_schema(df) == []
    assert validate_dtypes(df) == []
    assert validate_target(df) == []


def test_quality_report_ok_and_stats(df):
    report = assess_quality(df)
    assert report.ok, report.errors
    stats = report.stats
    assert stats["rows"] == 6000
    assert stats["fraud_count"] > 0
    assert 0 < stats["fraud_rate"] < 0.05
    assert stats["duplicate_rows"] >= 0
    assert any("imbalance" in w for w in report.warnings)


def test_schema_rejects_missing_columns(df):
    assert len(validate_schema(df.drop(columns=["Amount"]))) == 1
    assert len(validate_schema(df[["V1", "V2"]])) >= 1


def test_schema_rejects_extra_columns(df):
    extra = df.copy()
    extra["PAN"] = 1234
    assert any("Unexpected extra" in e for e in validate_schema(extra))


def test_dtypes_reject_strings(df):
    bad = df.copy()
    bad["Amount"] = bad["Amount"].astype(str)
    assert len(validate_dtypes(bad)) == 1


def test_target_validation(df):
    assert validate_target(df) == []
    bad = df.copy()
    bad.loc[bad.index[0], TARGET] = 2
    assert len(validate_target(bad)) == 1
    with_nan = df.copy()
    with_nan.loc[with_nan.index[0], TARGET] = np.nan
    assert len(validate_target(with_nan)) == 1


def test_quality_flags_missing_values(df):
    bad = df.copy()
    bad.loc[bad.index[0], "V1"] = np.nan
    report = assess_quality(bad)
    assert not report.ok
    assert any("Missing values" in e for e in report.errors)


def test_quality_flags_infinite_values(df):
    bad = df.copy()
    bad.loc[bad.index[0], "V14"] = np.inf
    report = assess_quality(bad)
    assert not report.ok
    assert any("Non-finite" in e for e in report.errors)


def test_quality_detects_leakage():
    leaked = generate_synthetic(n_rows=2000, fraud_rate=0.01, seed=3)
    # Overwrite an existing feature with a near-perfect target copy (no extra column).
    leaked["V28"] = leaked[TARGET] * 100.0 + 1e-9
    report = assess_quality(leaked)
    assert not report.ok
    assert any("leakage" in e.lower() for e in report.errors)


def test_load_dataset_missing_file_raises(tmp_path):
    from app.fraud_detector.data.loading import load_dataset

    with pytest.raises(FileNotFoundError):
        load_dataset(tmp_path / "nope.csv")
