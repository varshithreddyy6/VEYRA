"""Model registry: locate, load and validate versioned model artifacts.

The registry owns the artifact layout contract — every consumer (API,
worker, tests) resolves the active model through this module instead of
poking at the filesystem directly.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

from app.fraud_detector.config import ARTIFACTS_PREPROCESSING
from app.fraud_detector.utils.artifacts import (
    BACKGROUND_FILE,
    PREPROCESSOR_FILE,
    active_version,
    list_versions,
    read_json,
    version_dir,
)

logger = logging.getLogger("app.model_registry")


@dataclass
class RegisteredModel:
    version: str
    model_path: Path
    metadata: dict = field(default_factory=dict)
    thresholds: dict = field(default_factory=dict)
    risk: dict = field(default_factory=dict)
    metrics: dict = field(default_factory=dict)
    shap_global: dict | None = None
    preprocessor_path: Path | None = None
    background_path: Path | None = None
    loaded: bool = False
    load_error: str | None = None

    @property
    def available(self) -> bool:
        return self.loaded and self.model_path.exists()


class ModelRegistry:
    """Filesystem-backed registry. Looks up the active version on every call
    so a freshly trained model becomes servable without an API restart."""

    def __init__(self) -> None:
        self._cache: dict[str, RegisteredModel] = {}

    def resolve(self) -> RegisteredModel | None:
        version = active_version()
        if version is None:
            logger.warning("No trained model artifacts found (artifacts/models is empty)")
            return None
        if version in self._cache:
            return self._cache[version]
        return self._load(version)

    def _load(self, version: str) -> RegisteredModel | None:
        vdir = version_dir(version)
        if not vdir.exists():
            return None
        reg = RegisteredModel(
            version=version,
            model_path=vdir / "model.joblib",
            metadata=read_json(vdir / "metadata.json") if (vdir / "metadata.json").exists() else {},
            thresholds=read_json(vdir / "thresholds.json") if (vdir / "thresholds.json").exists() else {},
            risk=read_json(vdir / "risk.json") if (vdir / "risk.json").exists() else {},
            metrics=read_json(vdir / "metrics.json") if (vdir / "metrics.json").exists() else {},
            shap_global=read_json(vdir / "shap_global.json") if (vdir / "shap_global.json").exists() else None,
            preprocessor_path=ARTIFACTS_PREPROCESSING / PREPROCESSOR_FILE
            if (ARTIFACTS_PREPROCESSING / PREPROCESSOR_FILE).exists()
            else None,
            background_path=ARTIFACTS_PREPROCESSING / BACKGROUND_FILE
            if (ARTIFACTS_PREPROCESSING / BACKGROUND_FILE).exists()
            else None,
            loaded=(vdir / "model.joblib").exists(),
        )
        self._cache[version] = reg
        return reg

    def versions(self) -> list[str]:
        return list_versions()

    def info(self) -> dict:
        """API-facing summary; null version means 'model not trained yet'."""
        reg = self.resolve()
        if reg is None:
            return {
                "available": False,
                "version": None,
                "message": (
                    "No trained model is available. Run the training pipeline: "
                    "`cd backend && python train_model.py` (requires data/raw/creditcard.csv)."
                ),
            }
        return {
            "available": reg.loaded,
            "version": reg.version,
            "model_type": reg.metadata.get("base_model", "XGBoost"),
            "metadata": reg.metadata,
            "threshold": {
                "value": reg.thresholds.get("best_threshold", 0.5),
                "selected_by": reg.thresholds.get("selected_by", "max_f1"),
                "alternatives": {
                    k: v for k, v in reg.thresholds.items() if k != "best_threshold" and k != "selected_by"
                },
            },
            "risk": reg.risk,
            "metrics": reg.metrics.get("test"),
            "explainability": reg.shap_global is not None,
            "caveat_note": (
                "If metadata.generator indicates synthetic data, every metric above "
                "describes synthetic data, not the real ULB dataset."
            ),
        }


registry = ModelRegistry()
