"""Model tests: probability range, class weighting, persist roundtrip."""
from __future__ import annotations

import numpy as np
import pytest

from app.fraud_detector.config import ModelConfig
from app.fraud_detector.features.build import FeaturePreprocessor, engineer_features
from app.fraud_detector.models.baseline import BaselineModel
from app.fraud_detector.models.xgboost_model import XGBFraudModel, compute_scale_pos_weight
from app.fraud_detector.utils.synthetic import generate_synthetic


@pytest.fixture(scope="module")
def data():
    df = generate_synthetic(n_rows=6000, fraud_rate=0.01, seed=21)
    y = df["Class"].to_numpy()
    eng = engineer_features(df)
    pp = FeaturePreprocessor().fit(eng.iloc[:4800])
    X = pp.transform(eng)
    return X, y


def test_compute_scale_pos_weight_uses_train_ratio():
    y = np.array([0, 0, 0, 0, 0, 0, 0, 0, 0, 1])
    assert compute_scale_pos_weight(y) == pytest.approx(9.0)
    assert compute_scale_pos_weight(np.array([1])) == pytest.approx(1.0)
    assert compute_scale_pos_weight(np.array([0, 1])) == pytest.approx(1.0)


def test_baseline_probabilities_in_range(data):
    X, y = data
    model = BaselineModel(ModelConfig()).fit(X[:4000], y[:4000])
    proba = model.predict_proba(X[4000:])
    assert proba.shape == (len(X) - 4000,)
    assert proba.min() >= 0.0 and proba.max() <= 1.0


def test_xgboost_probabilities_in_range(data):
    X, y = data
    xgb = XGBFraudModel(ModelConfig())
    xgb.fit(X[:4000], y[:4000])
    proba = xgb.predict_proba(X[4000:])
    assert proba.shape == (len(X) - 4000,)
    assert proba.min() >= 0.0 and proba.max() <= 1.0
    # scale_pos_weight must have been auto-derived from the training split
    assert xgb.config["scale_pos_weight"] == pytest.approx(compute_scale_pos_weight(y[:4000]))


def test_xgboost_beats_random_on_synthetic(data):
    """Sanity check, not a performance claim: on synthetic data with planted
    fraud drivers, the fitted model must clearly beat a coin flip."""
    X, y = data
    xgb = XGBFraudModel(ModelConfig()).fit(X[:4000], y[:4000])
    proba = xgb.predict_proba(X[4000:])
    from sklearn.metrics import roc_auc_score

    assert roc_auc_score(y[4000:], proba) > 0.8


def test_model_save_load_roundtrip(data, tmp_path):
    X, y = data
    xgb = XGBFraudModel(ModelConfig()).fit(X[:4000], y[:4000])
    path = tmp_path / "model.joblib"
    xgb.save(path)

    loaded = XGBFraudModel.load(path)
    np.testing.assert_allclose(xgb.predict_proba(X[4000:4005]), loaded.predict_proba(X[4000:4005]), atol=1e-7)
    assert loaded.config["scale_pos_weight"] == xgb.config["scale_pos_weight"]


def test_config_reproducible_seed():
    a = ModelConfig()
    b = ModelConfig()
    assert a.xgb["random_state"] == b.xgb["random_state"] == 42
    assert a.tuning["scoring"] == "average_precision"
