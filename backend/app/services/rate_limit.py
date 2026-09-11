"""Rate limiting with Redis acceleration and an in-process fallback.

A proper multi-instance deployment would enforce limits in the gateway or a
shared Redis counter; this module implements the Redis counter and degrades
gracefully to a per-process windowed counter when Redis is unreachable
(which is the common local-dev case).
"""
from __future__ import annotations

import logging
import time
from collections import defaultdict, deque

from app.core.config import settings

logger = logging.getLogger("app.rate_limit")

try:
    import redis as redis_lib
except ImportError:  # pragma: no cover
    redis_lib = None


class _MemoryWindow:
    def __init__(self) -> None:
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        bucket = self.hits[key]
        while bucket and bucket[0] <= now - window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


class RateLimiter:
    def __init__(self) -> None:
        self._memory = _MemoryWindow()
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

    def check(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        """Increment the counter for key; return False when the limit is hit."""
        if self._redis is not None:
            try:
                bucket = self._redis.pipeline()
                bucket.incr(f"rl:{key}")
                bucket.expire(f"rl:{key}", window_seconds)
                current, _ = bucket.execute()
                return int(current) <= limit
            except Exception:
                logger.debug("Redis limiter unavailable; using memory fallback")
        return self._memory.hit(key, limit, window_seconds)


rate_limiter = RateLimiter()


def check_rate_limit(key: str, limit: int, window_seconds: int = 60) -> bool:
    return rate_limiter.check(key, limit, window_seconds)
