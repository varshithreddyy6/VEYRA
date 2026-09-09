"""API integration tests: health, screening, validation, transactions, model info."""
from __future__ import annotations

import pytest


def test_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["app"] == "Credit Card Fraud Detection System"
    assert "database" in body and "model" in body
    assert body["model"]["available"] in (True, False)  # honest state either way


def test_health_has_security_headers(client):
    res = client.get("/api/v1/health")
    assert res.headers.get("x-content-type-options") == "nosniff"
    assert res.headers.get("x-frame-options") == "DENY"


def test_screen_requires_auth(client, screen_payload):
    assert client.post("/api/v1/screen", json=screen_payload).status_code == 401


def test_screen_validation_errors(client, registered_user, screen_payload):
    headers, _ = registered_user
    # missing features
    bad = {"amount": 10, "occurred_at": screen_payload["occurred_at"], "features": {"V1": 0.1}}
    assert client.post("/api/v1/screen", json=bad, headers=headers).status_code == 422
    # non-finite feature (sent as a JSON-compliant string; Pydantic coerces to float)
    bad2 = {**screen_payload, "features": {**screen_payload["features"], "V3": "NaN"}}
    res2 = client.post("/api/v1/screen", json=bad2, headers=headers)
    assert res2.status_code == 422, res2.text
    # card number in external ref → validation error mentioning card numbers
    bad3 = {**screen_payload, "external_ref": "4111 1111 1111 1111"}
    res = client.post("/api/v1/screen", json=bad3, headers=headers)
    assert res.status_code == 422
    assert "card" in str(res.json()["detail"]).lower()
    # out-of-range amount
    bad4 = {**screen_payload, "amount": 2_000_000}
    assert client.post("/api/v1/screen", json=bad4, headers=headers).status_code == 422
    # malformed timestamp
    bad5 = {**screen_payload, "occurred_at": "not-a-date"}
    assert client.post("/api/v1/screen", json=bad5, headers=headers).status_code == 422


def test_screen_persists_transaction_and_screening(client, registered_user, screen_payload, patch_model):
    headers, user = registered_user
    res = client.post("/api/v1/screen", json=screen_payload, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["fraud_probability"] == pytest.approx(0.94)
    assert body["prediction"] == "fraud"
    assert body["risk_category"] == "HIGH"
    assert body["model_version"] == "CCDFS-TEST-V1"
    assert body["explanation"]["available"] is True
    assert len(body["explanation"]["contributions"]) >= 3
    # persisted
    tx = client.get(f"/api/v1/transactions/{body['transaction_id']}", headers=headers)
    assert tx.status_code == 200
    detail = tx.json()
    assert detail["amount"] == pytest.approx(screen_payload["amount"])
    assert len(detail["screenings"]) == 1
    assert detail["screenings"][0]["prediction"] == "fraud"

    # transactions list contains it
    listing = client.get("/api/v1/transactions", headers=headers)
    assert listing.status_code == 200
    assert listing.json()["total"] >= 1


def test_transactions_are_user_scoped(client, registered_user, screen_payload, patch_model):
    headers_a, _ = registered_user
    client.post("/api/v1/screen", json=screen_payload, headers=headers_a)

    # a second user must not see the first user's transactions
    import uuid as _uuid

    reg = client.post("/api/v1/auth/register", json={
        "email": f"other-{_uuid.uuid4().hex[:8]}@example.com",
        "full_name": "Other", "password": "Password123!",
    }).json()
    headers_b = {"Authorization": f"Bearer {reg['tokens']['access_token']}"}

    listing_a = client.get("/api/v1/transactions", headers=headers_a).json()
    listing_b = client.get("/api/v1/transactions", headers=headers_b).json()
    assert listing_a["total"] >= 1
    assert listing_b["total"] == 0


def test_transaction_detail_404_for_other_user(client, registered_user, screen_payload, patch_model):
    headers_a, _ = registered_user
    res = client.post("/api/v1/screen", json=screen_payload, headers=headers_a)
    txn_id = res.json()["transaction_id"]

    import uuid as _uuid

    reg = client.post("/api/v1/auth/register", json={
        "email": f"b-{_uuid.uuid4().hex[:8]}@example.com", "full_name": "B User", "password": "Password123!",
    }).json()
    headers_b = {"Authorization": f"Bearer {reg['tokens']['access_token']}"}
    detail = client.get(f"/api/v1/transactions/{txn_id}", headers=headers_b)
    assert detail.status_code == 404


def test_model_info_honest_unavailable_state(client, registered_user):
    """Without artifacts (test environment), the API must say so plainly."""
    headers, _ = registered_user
    res = client.get("/api/v1/model/info", headers=headers)
    assert res.status_code == 200
    body = res.json()
    # The registry resolves from the isolated artifact dir → nothing trained there.
    assert body["available"] in (True, False)
    if not body["available"]:
        assert "train" in (body["message"] or "").lower()


def test_model_metrics_unavailable_state(client, registered_user):
    headers, _ = registered_user
    res = client.get("/api/v1/model/metrics", headers=headers)
    assert res.status_code == 200
    body = res.json()
    if not body["available"]:
        assert body["metrics"] is None
        assert "train" in body["message"].lower()


def test_alerts_endpoint(client, registered_user, screen_payload, patch_model):
    headers, _ = registered_user
    client.post("/api/v1/screen", json=screen_payload, headers=headers)
    res = client.get("/api/v1/alerts", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["items"]) >= 1


def test_every_route_has_openapi_and_typed_responses(client):
    spec = client.get("/api/v1/openapi.json")
    assert spec.status_code == 200
    paths = spec.json()["paths"]
    assert "/api/v1/screen" in paths
    assert "/api/v1/auth/login" in paths
    assert "/api/v1/batch" in paths
    assert "/api/v1/model/info" in paths
    assert "/api/v1/alerts" in paths
    assert "/api/v1/transactions" in paths
