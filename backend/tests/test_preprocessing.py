"""Feature engineering tests: determinism, shape, persistence parity."""
from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from app.fraud_detector.config import AMOUNT_LOG, HOUR_COS, HOUR_SIN, PRINCIPAL_FEATURES
from app.fraud_detector.features.build import (
    FEATURE_COLUMNS,
    FeaturePreprocessor,
    engineer_features,
    get_feature_columns,
)
from app.fraud_detector.utils.synthetic import generate_synthetic


@pytest.fixture(scope="module")
def raw() -> pd.DataFrame:
    return generate_synthetic(n_rows=4000, seed=11)


def test_engineer_produces_expected_columns(raw):
    eng = engineer_features(raw)
    assert HOUR_SIN in eng.columns and HOUR_COS in eng.columns and AMOUNT_LOG in eng.columns
    assert "Time" not in eng.columns and "Amount" not in eng.columns


def test_engineering_is_deterministic(raw):
    a = engineer_features(raw)
    b = engineer_features(raw)
    pd.testing.assert_frame_equal(a, b)


def test_hour_encoding_math(raw):
    eng = engineer_features(raw)
    # Time is a seconds-offset: hour = (Time % 86400)/3600, encoded circularly.
    hours = (raw["Time"] % 86400.0) / 3600.0
    expected_sin = np.sin(2 * np.pi * hours / 24.0)
    expected_cos = np.cos(2 * np.pi * hours / 24.0)
    np.testing.assert_allclose(eng[HOUR_SIN].to_numpy(), expected_sin, atol=1e-9)
    np.testing.assert_allclose(eng[HOUR_COS].to_numpy(), expected_cos, atol=1e-9)
    # Wraparound continuity: hour 23.9 and 0.1 must give close values.
    assert abs(np.sin(2 * np.pi * 23.9 / 24) - np.sin(2 * np.pi * 0.1 / 24)) < 0.1


def test_amount_log1p(raw):
    eng = engineer_features(raw)
    assert np.allclose(eng[AMOUNT_LOG], np.log1p(raw["Amount"]))


def test_engineer_rejects_missing_columns(raw):
    with pytest.raises(ValueError):
        engineer_features(raw.drop(columns=["Time"]))


def test_preprocessor_fit_transform_shape(raw):
    eng = engineer_features(raw)
    pp = FeaturePreprocessor().fit(eng)
    X = pp.transform(eng)
    assert X.shape == (len(eng), len(FEATURE_COLUMNS))
    assert np.isfinite(X).all()


def test_preprocessor_save_load_roundtrip(raw, tmp_path):
    eng = engineer_features(raw)
    pp = FeaturePreprocessor().fit(eng)
    path = pp.save(tmp_path / "prep.joblib")
    loaded = FeaturePreprocessor.load(path)

    X1 = pp.transform(eng)
    X2 = loaded.transform(eng)
    np.testing.assert_allclose(X1, X2)


def test_scalers_fit_on_train_only(raw):
    """Scaling statistics must come exclusively from the training data."""
    eng_all = engineer_features(raw)
    train = eng_all.iloc[:2000]
    pp = FeaturePreprocessor().fit(train)

    pca_scaler = pp.pipeline.named_steps["scale"].transformers_[0][1]
    # Scaler means equal the TRAIN means, not the full-dataset means.
    np.testing.assert_allclose(pca_scaler.mean_, train.iloc[:, :28].mean().to_numpy(), atol=1e-9)
    assert not np.allclose(pca_scaler.mean_, eng_all.iloc[:, :28].mean().to_numpy(), atol=1e-4)

    X_train = pp.transform(train)
    assert abs(X_train.mean(axis=0).mean()) < 0.5  # standardised, not raw scale


def test_feature_column_list_stable():
    assert get_feature_columns() == [*PRINCIPAL_FEATURES, HOUR_SIN, HOUR_COS, AMOUNT_LOG]
