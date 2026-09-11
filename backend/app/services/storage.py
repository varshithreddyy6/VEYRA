"""Upload handling and batch CSV validation.

Security posture for uploads:
  * extension + content-type checks (defense in depth)
  * hard size cap (settings.max_upload_bytes)
  * required column checks (Amount, Time, V1..V28, optional Class/external_ref)
  * strict numeric validation, non-finite rejection
  * raw card-number rejection (the platform cannot ingest PANs by design)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import pandas as pd

from app.core.config import settings
from app.fraud_detector.config import PRINCIPAL_FEATURES
from app.fraud_detector.utils.schema import CARD_LIKE_RE, FeatureValidationError, validate_occurred_at

logger = logging.getLogger("app.storage")

ALLOWED_EXTENSIONS = {".csv"}
ALLOWED_CONTENT_TYPES = {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"}
REQUIRED_COLUMNS = ["Amount", "Time", *PRINCIPAL_FEATURES]
OPTIONAL_COLUMNS = ["Class", "external_ref", "occurred_at"]

MAX_ROWS = 100_000


@dataclass
class UploadSpec:
    filename: str
    path: Path
    df: pd.DataFrame = field(repr=False, default=None)  # type: ignore[assignment]
    columns: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def has_labels(self) -> bool:
        return "Class" in self.columns


class UploadValidationError(ValueError):
    pass


def validate_upload(filename: str, content_type: str, size: int) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadValidationError(f"Only .csv files are accepted (got {ext or 'no extension'})")
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise UploadValidationError(f"Content type {content_type!r} is not accepted")
    if size <= 0:
        raise UploadValidationError("Uploaded file is empty")
    if size > settings.max_upload_bytes:
        raise UploadValidationError(
            f"File is {size/1024/1024:.1f} MB; the limit is {settings.max_upload_mb} MB"
        )


def parse_batch_csv(path: Path) -> UploadSpec:
    """Parse + validate a batch CSV into a normalized frame."""
    try:
        df = pd.read_csv(path, encoding="utf-8-sig")
    except Exception as exc:
        raise UploadValidationError(f"Could not parse CSV: {exc}") from exc

    columns = [str(c).strip() for c in df.columns]
    df.columns = columns

    missing = [c for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise UploadValidationError(f"Missing required column(s): {missing}")

    unknown = [c for c in columns if c not in REQUIRED_COLUMNS + OPTIONAL_COLUMNS]
    if unknown:
        raise UploadValidationError(f"Unknown column(s): {unknown}")

    if len(df) == 0:
        raise UploadValidationError("CSV contains no data rows")
    if len(df) > MAX_ROWS:
        raise UploadValidationError(f"CSV exceeds the {MAX_ROWS:,}-row limit for a single job")

    # Card-number guard: scan any string-ish column for PAN-like values.
    for col in columns:
        if df[col].dtype == object:
            sampled = df[col].astype(str).head(200)
            if any(CARD_LIKE_RE.match(v) for v in sampled):
                raise UploadValidationError(
                    "Raw card numbers are not accepted — provide anonymized features only."
                )
        if CARD_LIKE_RE.match(str(col)):
            raise UploadValidationError("Raw card numbers are not accepted — anonymized features only.")

    # Type + finiteness validation
    warnings: list[str] = []
    for col in REQUIRED_COLUMNS:
        coerced = pd.to_numeric(df[col], errors="coerce")
        n_bad = int(coerced.isna().sum())
        if n_bad:
            raise UploadValidationError(f"Column {col!r} contains {n_bad} non-numeric/missing value(s)")
        if col.startswith("V") and coerced.abs().max() > 100:
            raise UploadValidationError(f"Column {col!r} contains values outside the plausible range")
        df[col] = coerced
    if not df["Amount"].div(1).between(0, 1_000_000, inclusive="both").all():
        raise UploadValidationError("Amount values must be between 0 and 1,000,000")
    if "Time" in df.columns and (df["Time"] < 0).any():
        raise UploadValidationError("Time values must be non-negative")

    # Optional columns, if present
    if "Class" in columns:
        non_null = df["Class"].dropna()
        if non_null.empty:
            # an entirely-blank Class column carries no information → treat as absent
            df = df.drop(columns=["Class"])
            columns = [c for c in columns if c != "Class"]
            warnings.append("'Class' column was present but empty; rows screened without ground-truth labels.")
        else:
            if not pd.to_numeric(non_null, errors="coerce").dropna().isin([0, 1]).all():
                raise UploadValidationError("Class column must contain only 0/1 (blank = unknown)")
            df["Class"] = pd.to_numeric(df["Class"], errors="coerce")
    if "external_ref" in columns:
        df["external_ref"] = df["external_ref"].fillna("").astype(str).str.strip()
    if "occurred_at" in columns:
        for i, v in enumerate(df["occurred_at"]):
            if pd.isna(v):
                continue
            try:
                validate_occurred_at(str(v))
            except FeatureValidationError as exc:
                raise UploadValidationError(f"Row {i + 2}: {exc}") from exc

    if "occurred_at" not in columns:
        warnings.append(
            "No 'occurred_at' column: batch rows use hours derived from Time (mod 24h) for rules."
        )
    if "Class" not in columns:
        warnings.append("No 'Class' column: rows are screened without ground-truth labels.")

    spec = UploadSpec(filename=path.name, path=path, df=df, columns=columns, warnings=warnings)
    logger.info("Batch CSV validated: %d rows, columns=%s", len(df), columns)
    return spec
