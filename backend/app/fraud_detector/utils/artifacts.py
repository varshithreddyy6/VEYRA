"""Artifact layout, versioning and IO helpers.

Layout (all under the repository root):

    artifacts/
      models/
        CCDFS-XGB-<timestamp>/model.joblib          (estimator + config)
        CCDFS-XGB-<timestamp>/metadata.json
        CCDFS-XGB-<timestamp>/thresholds.json
        CCDFS-XGB-<timestamp>/risk.json
        CCDFS-XGB-<timestamp>/metrics.json
        CCDFS-XGB-<timestamp>/shap_global.json
        latest.json                                 (pointer to active version)
      preprocessing/
        preprocessor.joblib
        shap_background.npy
      metrics/     (training report JSON copies)
      explainability/ (global summary plots)

The API resolves the active version through latest.json (or MODEL_VERSION).
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from app.fraud_detector.config import (
    ARTIFACTS_EXPLAINABILITY,
    ARTIFACTS_METRICS,
    ARTIFACTS_MODELS,
    ARTIFACTS_PREPROCESSING,
)

logger = logging.getLogger("fraud.artifacts")

PREPROCESSOR_FILE = "preprocessor.joblib"
BACKGROUND_FILE = "shap_background.npy"
LATEST_POINTER = "latest.json"


def version_now() -> str:
    return "CCDFS-XGB-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")


def ensure_dirs() -> None:
    for p in (ARTIFACTS_MODELS, ARTIFACTS_PREPROCESSING, ARTIFACTS_METRICS, ARTIFACTS_EXPLAINABILITY):
        p.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def list_versions() -> list[str]:
    if not ARTIFACTS_MODELS.exists():
        return []
    return sorted(
        p.name for p in ARTIFACTS_MODELS.iterdir() if p.is_dir() and p.name.startswith("CCDFS-XGB-")
    )


def active_version() -> str | None:
    """Resolve the active model version (env override wins, else latest.json)."""
    from app.core.config import settings

    if settings.model_version:
        if (ARTIFACTS_MODELS / settings.model_version).exists():
            return settings.model_version
        logger.warning("MODEL_VERSION=%s not found; falling back to latest.json", settings.model_version)

    pointer = ARTIFACTS_MODELS / LATEST_POINTER
    if pointer.exists():
        return read_json(pointer).get("active_version")
    versions = list_versions()
    return versions[-1] if versions else None


def set_active_version(version: str) -> None:
    write_json(
        ARTIFACTS_MODELS / LATEST_POINTER,
        {"active_version": version, "updated_at": datetime.now(timezone.utc).isoformat()},
    )


def version_dir(version: str) -> Path:
    return ARTIFACTS_MODELS / version


def save_preprocessor(pipeline, background: np.ndarray) -> dict[str, str]:
    ensure_dirs()
    pp_path = ARTIFACTS_PREPROCESSING / PREPROCESSOR_FILE
    bg_path = ARTIFACTS_PREPROCESSING / BACKGROUND_FILE
    import joblib

    joblib.dump(pipeline, pp_path)
    np.save(bg_path, background)
    logger.info("Preprocessor → %s ; SHAP background (%d rows) → %s", pp_path, len(background), bg_path)
    return {"preprocessor": str(pp_path), "shap_background": str(bg_path)}


def save_metrics_copy(metrics: dict, version: str) -> Path:
    path = ARTIFACTS_METRICS / f"{version}.json"
    write_json(path, metrics)
    return path
