"""Celery tasks: asynchronous batch CSV scoring.

``process_batch_file`` streams the validated CSV in chunks, runs the
identical per-row pipeline used by single screening (rules + model +
threshold + risk), persists each screening, updates job progress in the
DB and finally writes a downloadable results CSV.
"""
from __future__ import annotations

import csv
import logging
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app.core.config import settings
from app.db.models import BatchJob, Screening, Transaction
from app.db.session import SessionLocal
from app.fraud_detector.config import PRINCIPAL_FEATURES, RESULTS_ROOT
from app.services.model_service import model_service
from app.services.rule_engine import RuleEngine
from app.services.storage import parse_batch_csv, UploadSpec
from app.workers.celery_app import celery_app

logger = logging.getLogger("app.tasks")

OUTPUT_DIR = RESULTS_ROOT / "predictions"


def _job(db, job_id: str) -> BatchJob:
    return db.get(BatchJob, job_id)


def _set_status(db, job: BatchJob, *, status: str | None = None, **fields) -> None:
    if status:
        job.status = status
    for k, v in fields.items():
        setattr(job, k, v)
    db.commit()


def _row_to_features(row: pd.Series) -> tuple[dict, float, float | None]:
    features = {c: float(row[c]) for c in PRINCIPAL_FEATURES if pd.notna(row.get(c))}
    amount = float(row["Amount"])
    time_offset = float(row["Time"]) if pd.notna(row.get("Time")) else 0.0
    return features, amount, time_offset


@celery_app.task(name="app.workers.tasks.process_batch_file", max_retries=0)
def process_batch_file(job_id: str, upload_path: str) -> dict:
    """Score every row of an uploaded CSV for one batch job.

    Progress is persisted in the batch_jobs row itself (processed_rows /
    flagged_rows), which is the surface the API exposes — Celery's internal
    state events are not required for the UI.
    """
    with SessionLocal() as db:
        job = _job(db, job_id)
        if job is None:
            raise ValueError(f"Batch job {job_id} not found in DB")

        _set_status(db, job, status="processing")

        try:
            spec: UploadSpec = parse_batch_csv(Path(upload_path))
        except Exception as exc:
            _set_status(db, job, status="failed", error=f"Validation failed: {exc}",
                        finished_at=datetime.now(timezone.utc))
            raise

        df = spec.df
        job.total_rows = len(df)
        db.commit()

        rule_engine = RuleEngine()
        chunk = settings.batch_chunk_size
        output_rows: list[dict] = []
        flagged = 0
        processed = 0

        for start in range(0, len(df), chunk):
            part = df.iloc[start:start + chunk]
            for _, row in part.iterrows():
                features, amount, time_offset = _row_to_features(row)

                external_ref = str(row.get("external_ref") or "").strip() or f"batch-{job_id[:8]}-{processed + 1}"
                occurred_at = datetime.fromisoformat(str(row["occurred_at"]).replace("Z", "+00:00")) \
                    if pd.notna(row.get("occurred_at")) and str(row["occurred_at"]).strip() \
                    else datetime.now(timezone.utc)

                # The rule engine runs first; the model output is authoritative.
                flags = rule_engine.evaluate_transaction(amount, occurred_at, external_ref)
                time_hour = (time_offset % 86400.0) / 3600.0
                result = model_service.predict(features, amount, time_hour=time_hour)

                prediction = result["prediction"]
                decided_by_rule = False
                if any(f["rule"] in ("amount_anomaly", "night_high_amount") for f in flags):
                    if prediction == "legit" and result["risk_category"] != "HIGH":
                        result["risk_category"] = "MEDIUM"
                        decided_by_rule = True
                    elif prediction == "fraud" and result["risk_category"] == "MEDIUM":
                        result["risk_category"] = "HIGH"
                        decided_by_rule = True

                if result["risk_category"] == "HIGH":
                    flagged += 1
                processed += 1

                transaction = Transaction(
                    user_id=job.user_id,
                    external_ref=external_ref,
                    amount=amount,
                    occurred_at=occurred_at,
                    features=features,
                    true_label=int(row["Class"]) if pd.notna(row.get("Class")) else None,
                )
                db.add(transaction)
                db.flush()
                db.add(Screening(
                    transaction_id=transaction.id,
                    user_id=job.user_id,
                    model_version=result["model_version"],
                    fraud_probability=result["fraud_probability"],
                    decision_threshold=result["decision_threshold"],
                    prediction=prediction,
                    risk_category=result["risk_category"],
                    shap_explanation={"available": False, "reason": "Batch jobs skip per-row SHAP"},
                    rule_flags=[f["rule"] for f in flags],
                    decided_by_rule=decided_by_rule,
                ))

                output_rows.append({
                    "row_index": processed,
                    "external_ref": external_ref,
                    "amount": amount,
                    "occurred_at": occurred_at.isoformat(),
                    "fraud_probability": round(result["fraud_probability"], 6),
                    "prediction": prediction,
                    "risk_category": result["risk_category"],
                    "decision_threshold": result["decision_threshold"],
                    "rule_flags": ";".join(f["rule"] for f in flags),
                    "true_label": int(row["Class"]) if pd.notna(row.get("Class")) else "",
                })

            db.commit()
            job.processed_rows = processed
            job.flagged_rows = flagged
            db.commit()

        # Write the downloadable result file
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        result_path = OUTPUT_DIR / f"batch_{job_id[:8]}_results.csv"
        with result_path.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=list(output_rows[0].keys()) if output_rows else [])
            if output_rows:
                writer.writeheader()
                writer.writerows(output_rows)

        _set_status(db, job, status="done", processed_rows=processed, flagged_rows=flagged,
                    result_path=str(result_path), preview=output_rows[:20],
                    finished_at=datetime.now(timezone.utc))
        logger.info("Batch job %s done: %d rows, %d flagged", job_id, processed, flagged)
        return {"status": "done", "processed": processed, "flagged": flagged,
                "result_path": str(result_path)}
