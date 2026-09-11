"""Refresh-token revocation store.

Refresh tokens are never stored server-side by default (stateless JWT).
Revocation is therefore *negative*: a `jti` is remembered until its natural
expiry. Redis holds the set when available; otherwise an in-process set is
used (single-instance dev — documented as a production TODO).
"""
from __future__ import annotations

import logging
import time

from app.core.config import settings
from app.core.security import refresh_token_key

logger = logging.getLogger("app.token_store")

try:
    import redis as redis_lib
except ImportError:  # pragma: no cover
    redis_lib = None


class TokenStore:
    def __init__(self) -> None:
        self._memory: dict[str, float] = {}
        self._redis = None
        if redis_lib is not None:
            try:
                self._redis = redis_lib.Redis.from_url(
                    settings.redis_url, socket_connect_timeout=1, socket_timeout=1, decode_responses=True
                )
                self._redis.ping()
            except Exception:
                self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis is not None else "memory"

    def revoke(self, jti: str, ttl_seconds: int) -> None:
        if self._redis is not None:
            try:
                self._redis.setex(refresh_token_key(jti), ttl_seconds, "revoked")
                return
            except Exception:
                logger.debug("Redis token store unavailable; falling back to memory")
        self._memory[jti] = time.time() + ttl_seconds

    def is_revoked(self, jti: str) -> bool:
        if self._redis is not None:
            try:
                return self._redis.exists(refresh_token_key(jti)) > 0
            except Exception:
                pass
        expires = self._memory.get(jti)
        if expires is None:
            return False
        if expires < time.time():
            self._memory.pop(jti, None)
            return False
        return True

    @staticmethod
    def ttl_seconds() -> int:
        return settings.jwt_refresh_ttl_days * 86400


token_store = TokenStore()
