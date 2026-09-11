"""Logging configuration.

Structured-ish console logging with a single formatter; no sensitive values
(passwords, tokens, full card data) are ever logged. Feature vectors are
logged only as shape/count hints.
"""
from __future__ import annotations

import logging
import sys


class SensitiveFilter(logging.Filter):
    """Prevent accidental logging of obvious secret material."""

    REDACTED = "[REDACTED]"
    _MARKERS = ("password", "token", "authorization", "secret", "jwt")

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            msg = record.getMessage()
        except Exception:
            return True
        lowered = msg.lower()
        if any(m in lowered for m in self._MARKERS):
            record.msg = self.REDACTED
            record.args = ()
        return True


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if getattr(root, "_ccdfs_configured", False):
        return
    root.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    handler.addFilter(SensitiveFilter())
    root.addHandler(handler)

    # Quiet noisy libraries
    for noisy in ("uvicorn.access", "watchfiles", "asyncio", "multipart"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    root._ccdfs_configured = True  # type: ignore[attr-defined]


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)
