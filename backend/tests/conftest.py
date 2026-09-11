"""Shared fixtures. Environment is pinned BEFORE any app import so the
settings/session modules pick up an isolated SQLite database, an
unreachable Redis (tests exercise the memory fallback path) and an
isolated artifact directory."""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

# ── Test environment (must be set before importing the app) ────────────────
_ARTIFACTS_TMP = Path(tempfile.mkdtemp(prefix="ccdfs-artifacts-"))
_TMP_DB = Path(tempfile.mkdtemp(prefix="ccdfs-db-")) / "test.db"

os.environ.update({
    "ENVIRONMENT": "testing",
    "DEBUG": "false",
    "DATABASE_URL": f"sqlite:///{_TMP_DB}",
    "REDIS_URL": "redis://127.0.0.1:63999/0",  # unreachable → memory fallbacks
    "JWT_SECRET": "test-secret-not-for-production",
    "JWT_ACCESS_TTL_MIN": "30",
    "JWT_REFRESH_TTL_DAYS": "7",
    "CORS_ORIGINS": "http://testserver",
    "FRAUD_ARTIFACTS_DIR": str(_ARTIFACTS_TMP),
    "FRAUD_DATA_DIR": str(Path(_ARTIFACTS_TMP) / "data"),
    "FRAUD_RESULTS_DIR": str(Path(_ARTIFACTS_TMP) / "results"),
    "RATE_LIMIT_LOGIN_PER_MINUTE": "100000",
    "RATE_LIMIT_SCREEN_PER_MINUTE": "100000",
    "MODEL_VERSION": "",
})

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def registered_user(client):
    """Register a fresh analyst; returns (headers, user dict)."""
    import uuid as _uuid

    payload = {
        "email": f"analyst-{_uuid.uuid4().hex[:10]}@example.com",
        "full_name": "Test Analyst",
        "password": "Password123!",
    }
    res = client.post("/api/v1/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    headers = {"Authorization": f"Bearer {data['tokens']['access_token']}"}
    return headers, data["user"]


@pytest.fixture()
def screen_payload():
    features = {f"V{i}": 0.0 for i in range(1, 29)}
    return {
        "amount": 133.0,
        "occurred_at": "2026-01-15T10:30:00+00:00",
        "features": features,
        "external_ref": "test-ref-001",
        "true_label": None,
    }


@pytest.fixture()
def patch_model(monkeypatch):
    """Deterministic fake model service so API tests don't need artifacts."""
    calls = {"count": 0}

    def fake_predict(features, amount, time_hour=None):
        calls["count"] += 1
        return {
            "fraud_probability": 0.94,
            "prediction": "fraud",
            "risk_category": "HIGH",
            "decision_threshold": 0.4273,
            "threshold_selected_by": "max_f1",
            "model_version": "CCDFS-TEST-V1",
            "risk_bands": {"low_cut": 0.30, "high_cut": 0.70},
        }

    def fake_explain(features, amount, time_hour=None):
        return {
            "available": True,
            "method": "TreeExplainer",
            "model_version": "CCDFS-TEST-V1",
            "base_value": 0.02,
            "predicted_probability": 0.94,
            "human_readable": "Test explanation: the model was pushed up by V14 and V10.",
            "contributions": [
                {"feature": "V14", "value": -4.2, "shap_value": 0.41, "direction": "increases_fraud_risk", "magnitude": 0.41},
                {"feature": "V10", "value": -1.1, "shap_value": 0.28, "direction": "increases_fraud_risk", "magnitude": 0.28},
                {"feature": "Amount_log1p", "value": 7.8, "shap_value": 0.19, "direction": "increases_fraud_risk", "magnitude": 0.19},
                {"feature": "V2", "value": 0.7, "shap_value": -0.05, "direction": "decreases_fraud_risk", "magnitude": 0.05},
            ],
            "feature_columns": ["V1", "V14", "V10", "Amount_log1p"],
            "note": "SHAP explains the model output; it is not causal evidence.",
        }

    import app.services.model_service as svc  # noqa: PLC0415

    monkeypatch.setattr(svc.model_service, "predict", fake_predict)
    monkeypatch.setattr(svc.model_service, "explain", fake_explain)
    # The registry still reports unavailable; a few routes call ensure_loaded
    # indirectly through the module-level function — patch that too.
    import app.services.scoring as scoring  # noqa: PLC0415

    monkeypatch.setattr(scoring.model_service, "predict", fake_predict)
    monkeypatch.setattr(scoring.model_service, "explain", fake_explain)
    return calls
