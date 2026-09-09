"""Password hashing and JWT utilities.

Passwords are hashed with Argon2id via pwdlib. JWTs carry a `type` claim
distinguishing access tokens from refresh tokens, and a `jti` (unique id)
that the refresh endpoint records in Redis so refresh tokens can be revoked.
"""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from pwdlib import PasswordHash

from app.core.config import settings

_password_hash = PasswordHash.recommended()

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


# ── Passwords ──────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    """Argon2id hash. Never store or log plaintext passwords."""
    return _password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _password_hash.verify(plain, hashed)
    except Exception:
        return False


# ── JWT ────────────────────────────────────────────────────────────────────
def _now() -> datetime:
    return datetime.now(timezone.utc)


def _create_token(
    subject: str,
    token_type: str,
    ttl: timedelta,
    extra: dict[str, Any] | None = None,
) -> tuple[str, datetime]:
    jti = secrets.token_urlsafe(16)
    now = _now()
    expires = now + ttl
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
    }
    if extra:
        payload.update(extra)
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, expires


def create_access_token(subject: str, role: str | None = None) -> tuple[str, datetime]:
    return _create_token(
        subject,
        ACCESS_TOKEN_TYPE,
        timedelta(minutes=settings.jwt_access_ttl_min),
        {"role": role} if role else None,
    )


def create_refresh_token(subject: str) -> tuple[str, datetime]:
    return _create_token(
        subject,
        REFRESH_TOKEN_TYPE,
        timedelta(days=settings.jwt_refresh_ttl_days),
    )


def decode_token(token: str, expected_type: str) -> dict[str, Any]:
    """Decode and validate a JWT. Raises jwt.PyJWTError on any problem."""
    payload = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["sub", "type", "exp", "iat", "jti"]},
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected {expected_type!r} token")
    return payload


def refresh_token_key(jti: str) -> str:
    return f"auth:refresh:jti:{jti}"


def token_family_key(jti: str) -> str:
    return f"auth:refresh:family:{jti[:16]}"
