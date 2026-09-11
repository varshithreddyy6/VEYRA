"""Batch CSV upload & job management.

Upload → validate → create BatchJob (queued) → send to Celery.
If the Redis broker is unreachable (plain local dev without a worker),
the job runs in a background thread using the same task function —
documented fallback, same code path, same output format.
"""
from __future__ import annotations

import logging
import math
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from app.core.dependencies import CurrentUser, DbSession
from app.db.models import BatchJob
from app.schemas.batch import BatchCreateResponse, BatchJobOut, PaginatedBatchJobs
from app.services.audit import audit, client_ip
from app.services.storage import UploadValidationError, parse_batch_csv, validate_upload

logger = logging.getLogger("app.batch")
router = APIRouter()

_executor = ThreadPoolExecutor(max_workers=2)
_tmp_root = Path(tempfile.gettempdir()) / "ccdfs-uploads"


@router.post("", response_model=BatchCreateResponse, status_code=status.HTTP_202_ACCEPTED,
             summary="Upload a CSV of transactions for batch screening")
async def create_batch(file: UploadFile, request: Request, user: CurrentUser, db: DbSession) -> BatchCreateResponse:
    filename = file.filename or "upload.csv"
    content_type = file.content_type or ""
    data = await file.read()

    # Validate robustly BEFORE enqueuing so failures are instant, not async.
    _tmp_root.mkdir(parents=True, exist_ok=True)
    tmp_path = _tmp_root / f"{uuid.uuid4().hex}.csv"
    tmp_path.write_bytes(data)
    try:
        validate_upload(filename, content_type, len(data))
        spec = parse_batch_csv(tmp_path)
    except UploadValidationError as exc:
        tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    job = BatchJob(
        user_id=user.id,
        filename=filename[:255],
        status="queued",
        total_rows=len(spec.df),
        preview=spec.df.head(3).to_dict(orient="records"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    audit(db, action="batch.create", entity_type="batch_job", entity_id=job.id,
          metadata_json={"filename": filename, "rows": len(spec.df)}, ip_address=client_ip(request))

    # Persist the validated CSV for the worker (job id is deterministic).
    worker_path = _tmp_root / f"job_{job.id}.csv"
    tmp_path.rename(worker_path)

    try:
        from app.workers.tasks import process_batch_file  # noqa: PLC0415

        process_batch_file.delay(job.id, str(worker_path))
        logger.info("Batch job %s enqueued to Celery", job.id)
    except Exception as exc:
        logger.warning("Broker unavailable (%s); running batch job %s in background thread", exc, job.id)
        _executor.submit(_run_sync, job.id, str(worker_path))

    # Keep back to the DB once more (enqueue might have changed nothing).
    db.refresh(job)
    return BatchCreateResponse(
        job=BatchJobOut.model_validate(job),
        message="Batch job accepted. Poll GET /api/v1/batch/{id} for progress.",
    )


def _run_sync(job_id: str, path: str) -> None:
    """Thread fallback executing the same task body used by Celery."""
    try:
        from app.workers.tasks import process_batch_file  # noqa: PLC0415

        process_batch_file.run(job_id, path)
    except Exception:
        logger.exception("Inline batch job %s failed", job_id)


@router.get("", response_model=PaginatedBatchJobs, summary="List my batch jobs")
def list_batches(
    user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
) -> PaginatedBatchJobs:
    base = select(BatchJob).where(BatchJob.user_id == user.id)
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(
        base.order_by(BatchJob.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).scalars().all()
    return PaginatedBatchJobs(
        items=[BatchJobOut.model_validate(r) for r in rows], total=total,
        page=page, page_size=page_size, pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/{job_id}", response_model=BatchJobOut, summary="Batch job status/progress")
def get_batch(job_id: str, user: CurrentUser, db: DbSession) -> BatchJobOut:
    job = db.execute(
        select(BatchJob).where(BatchJob.id == job_id, BatchJob.user_id == user.id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch job not found")
    return BatchJobOut.model_validate(job)


@router.get("/{job_id}/download", summary="Download batch results CSV")
def download_batch(job_id: str, user: CurrentUser, db: DbSession, request: Request) -> FileResponse:
    job = db.execute(
        select(BatchJob).where(BatchJob.id == job_id, BatchJob.user_id == user.id)
    ).scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch job not found")
    if job.status != "done" or not job.result_path:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Results not ready (status={job.status})")
    path = Path(job.result_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Result file missing")
    audit(db, action="batch.download", entity_type="batch_job", entity_id=job.id,
          ip_address=client_ip(request))
    return FileResponse(
        path,
        media_type="text/csv",
        filename=f"credit_card_fraud_batch_{job.id[:8]}_results.csv",
    )
