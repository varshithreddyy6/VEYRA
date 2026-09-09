"""Authentication tests: register, login, token flows, RBAC, revocation."""
from __future__ import annotations

import time


def test_register_returns_tokens_and_no_password(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "new.analyst@example.com",
        "full_name": "New Analyst",
        "password": "Password123!",
    })
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["tokens"]["access_token"] and body["tokens"]["refresh_token"]
    assert body["user"]["role"] == "analyst"
    assert "password" not in res.text.lower() or "hashed" not in res.text.lower()


def test_register_rejects_duplicate_email(client):
    payload = {"email": "dup@example.com", "full_name": "Dup", "password": "Password123!"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_register_rejects_self_service_admin(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "wannabe.admin@example.com", "full_name": "Nope", "password": "Password123!", "role": "admin",
    })
    assert res.status_code == 403


def test_register_rejects_weak_password(client):
    res = client.post("/api/v1/auth/register", json={
        "email": "weak@example.com", "full_name": "Weak", "password": "short",
    })
    assert res.status_code == 422


def test_login_success_and_failure(client):
    client.post("/api/v1/auth/register", json={
        "email": "login.test@example.com", "full_name": "Login Test", "password": "Password123!",
    })
    ok = client.post("/api/v1/auth/login", json={"email": "login.test@example.com", "password": "Password123!"})
    assert ok.status_code == 200
    assert ok.json()["tokens"]["access_token"]

    bad = client.post("/api/v1/auth/login", json={"email": "login.test@example.com", "password": "wrong-password"})
    assert bad.status_code == 401
    unknown = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "whatever123"})
    assert unknown.status_code == 401


def test_me_requires_auth(client, registered_user):
    headers, user = registered_user
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 200
    assert res.json()["email"] == user["email"]

    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_refresh_flow(client):
    client.post("/api/v1/auth/register", json={
        "email": "refresh.test@example.com", "full_name": "Refresh", "password": "Password123!",
    })
    login = client.post("/api/v1/auth/login", json={
        "email": "refresh.test@example.com", "password": "Password123!",
    }).json()
    refresh = login["tokens"]["refresh_token"]
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 200
    assert res.json()["access_token"]


def test_logout_revokes_refresh(client):
    client.post("/api/v1/auth/register", json={
        "email": "logout.test@example.com", "full_name": "Logout", "password": "Password123!",
    })
    login = client.post("/api/v1/auth/login", json={
        "email": "logout.test@example.com", "password": "Password123!",
    }).json()
    refresh = login["tokens"]["refresh_token"]
    out = client.post("/api/v1/auth/logout", json={"refresh_token": refresh})
    assert out.status_code == 200 and out.json()["revoked"] is True
    after = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert after.status_code == 401


def test_access_token_expiry_rejected(client):
    """A token with an expired exp claim must be refused, even if signed."""
    client.post("/api/v1/auth/register", json={
        "email": "exp@example.com", "full_name": "Exp", "password": "Password123!",
    })
    login = client.post("/api/v1/auth/login", json={"email": "exp@example.com", "password": "Password123!"}).json()
    import jwt as pyjwt
    from app.core.config import settings

    payload = pyjwt.decode(login["tokens"]["access_token"], settings.jwt_secret, algorithms=["HS256"])
    payload["exp"] = int(time.time()) - 60
    forged = pyjwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401


def test_refresh_token_cannot_be_used_as_access(client):
    client.post("/api/v1/auth/register", json={
        "email": "typemix@example.com", "full_name": "TypeMix", "password": "Password123!",
    })
    login = client.post("/api/v1/auth/login", json={"email": "typemix@example.com", "password": "Password123!"}).json()
    res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {login['tokens']['refresh_token']}"})
    assert res.status_code == 401
