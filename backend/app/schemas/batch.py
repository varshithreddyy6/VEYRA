"""Batch job schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class BatchJobOut(BaseModel):
    id: str
    filename: str
    status: str  # queued | processing | done | failed
    total_rows: int
    processed_rows: int
    flagged_rows: int
    error: str | None = None
    result_path: str | None = None
    preview: list[dict[str, Any]] | None = None
    created_at: datetime
    finished_at: datetime | None = None
    model_config = {"from_attributes": True}


class BatchCreateResponse(BaseModel):
    job: BatchJobOut
    ok: bool = True
    message: str


class PaginatedBatchJobs(BaseModel):
    items: list[BatchJobOut]
    total: int
    page: int
    page_size: int
    pages: int
