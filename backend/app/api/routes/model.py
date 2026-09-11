"""Model information, metrics, global SHAP explanation, retraining trigger."""
from __future__ import annotations

import logging
import subprocess
import sys
import threading
from pathlib import Path

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import AdminUser
from app.services.model_registry import registry
from app.schemas.model import MetricsOut, ModelInfoOut

logger = logging.getLogger("app.model")
router = APIRouter()

_retrain_lock = threading.Lock()
_retrain_running = {"value": False}


@router.get("/info", response_model=ModelInfoOut, summary="Active model information")
def model_info() -> ModelInfoOut:
    info = registry.info()
    return ModelInfoOut(**info)


@router.get("/metrics", response_model=MetricsOut, summary="Evaluation metrics of the active model")
def model_metrics() -> MetricsOut:
    reg = registry.resolve()
    if reg is None or not reg.loaded:
        return MetricsOut(
            available=False,
            message=(
                "No trained model exists, so no metrics can be shown. "
                "Train first: `cd backend && python train_model.py`."
            ),
        )
    test_metrics = reg.metrics.get("test", {}) if reg.metrics else {}
    baseline = (reg.metrics.get("baseline_test") or {}) if reg.metrics else None
    return MetricsOut(
        available=True,
        model_version=reg.version,
        metrics=test_metrics,
        baseline=baseline,
        threshold={"value": reg.thresholds.get("best_threshold"), "selected_by": reg.thresholds.get("selected_by")},
        dataset=(reg.metadata or {}).get("dataset"),
    )


@router.get("/global-explanation", summary="Global SHAP feature importance")
def global_explanation() -> dict:
    reg = registry.resolve()
    if reg is None or not reg.loaded:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                            detail="No trained model available")
    if reg.shap_global is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This model was trained without SHAP. Re-run with SHAP enabled "
                   "(`python train_model.py` without --no-shap).",
        )
    return {
        "available": True,
        "model_version": reg.version,
        "explainer_method": reg.shap_global.get("explainer_method"),
        "features": reg.shap_global.get("features", []),
        "summary_plot": reg.shap_global.get("summary_plot"),
        "note": "SHAP describes the model's learned feature contributions; it is not causal evidence.",
    }


@router.post("/retrain", status_code=status.HTTP_202_ACCEPTED,
             summary="[admin] Trigger a retraining run in the background")
def retrain(user: AdminUser) -> dict:
    if _retrain_running["value"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A retraining run is already in progress")
    _retrain_running["value"] = True

    def _run() -> None:
        try:
            backend_dir = Path(__file__).resolve().parents[2]
            result = subprocess.run(
                [sys.executable, "train_model.py"],
                cwd=str(backend_dir),
                capture_output=True,
                text=True,
                timeout=3600,
            )
            logger.info("Retrain exit=%s; tail: %s", result.returncode, result.stdout[-1200:])
        except Exception:
            logger.exception("Retraining failed")
        finally:
            _retrain_running["value"] = False

    threading.Thread(target=_run, daemon=True).start()
    logger.info("Retraining triggered by admin %s", user.email)
    return {
        "status": "started",
        "message": "Retraining started in the background. Poll GET /api/v1/model/info to see the "
                   "new version when it completes (training needs data/raw/creditcard.csv).",
    }
