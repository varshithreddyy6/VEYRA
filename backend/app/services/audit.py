"""Audit trail service.

Writes an append-only log row for meaningful actions: auth events,
screenings, batch operations, model info reads. Never stores passwords,
tokens or raw feature payloads.
"""
from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from app.db.models import AuditLog, User

logger = logging.getLogger("app.audit")

ALLOWED_ACTIONS = {
    "auth.register",
    "auth.login",
    "auth.refresh",
    "auth.logout",
    "screen.transaction",
    "batch.create",
    "batch.download",
    "model.info",
    "model.metrics",
}


def audit(
    db: Session,
    *,
    action: str,
    entity_type: str,
    user: User | None = None,
    entity_id: str | None = None,
    metadata_json: dict | None = None,
    ip_address: str | None = None,
    commit: bool = True,
) -> AuditLog:
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Action {action!r} is not an auditable action")
    row = AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata_json or {},
        ip_address=ip_address,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    return row


def client_ip(request) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
