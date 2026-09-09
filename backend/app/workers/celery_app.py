"""Celery application definition.

Uses Redis as both broker and result backend. Tasks run in a separate
worker process (docker-compose service `worker`, or `make worker`).
"""
from __future__ import annotations

import logging

from celery import Celery

from app.core.config import settings
from app.core.logging import configure_logging

configure_logging()
logger = logging.getLogger("app.celery")

celery_app = Celery(
    "credit_card_fraud_detection_system",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60 * 60,       # 1 hour hard cap per task
    task_soft_time_limit=55 * 60,
    worker_prefetch_multiplier=1,  # fair distribution of heavy batch jobs
    task_acks_late=True,
    result_expires=60 * 60 * 24,
    broker_connection_retry_on_startup=True,
    task_routes={
        "app.workers.tasks.process_batch_file": {"queue": "batch"},
        "*": {"queue": "default"},
    },
    beat_schedule={},
)

logger.info("Celery app configured (broker=%s)", settings.redis_url.split("@")[-1])
