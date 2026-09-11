"""ML serving layer.

Loads the active model + preprocessor once, then serves predictions,
thresholds, risk categories and SHAP explanations. Also owns the
"load-or-train" startup behaviour used by Docker.
"""
from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from app.fraud_detector.config import DATA_ROOT, RISK_CONFIG, RiskConfig
from app.fraud_detector.explainability.shap_explain import (
    build_explainer,
    local_explanation,
    summarize,
)
from app.fraud_detector.features.build import FEATURE_COLUMNS, FeaturePreprocessor, engineer_features
from app.fraud_detector.models.xgboost_model import XGBFraudModel
from app.services.model_registry import RegisteredModel, registry

logger = logging.getLogger("app.model_service")

MODEL_UNAVAILABLE_MSG = (
    "No trained model available. Run `cd backend && python train_model.py` "
    "(or `make train`) and try again."
)


class ModelService:
    """Caches the loaded estimator; re-resolves the active version lazily so
    a retraining run becomes servable without an API restart."""

    def __init__(self) -> None:
        self._estimator: XGBFraudModel | None = None
        self._preprocessor: FeaturePreprocessor | None = None
        self._explainer = None
        self._loaded_version: str | None = None
        self._background: np.ndarray | None = None
        self._load_attempted: bool = False

    # ── Loading ────────────────────────────────────────────────────────────
    def load_or_train_if_ready(self) -> None:
        """Startup hook: load artifacts; if none exist and a dataset is
        present (or downloadable), run the training pipeline once.

        This is what makes `docker compose up` a complete experience while
        keeping the honest "unavailable" state when nothing is trained.
        """
        reg = registry.resolve()
        if reg is not None and reg.loaded:
            self._load(reg)
            return
        if self._load_attempted:
            return
        self._load_attempted = True
        logger.warning("No model artifact found — checking for a dataset to train on...")
        data_path = DATA_ROOT / "raw" / "creditcard.csv"
        try:
            if data_path.exists():
                logger.info("Dataset present; running the training pipeline (this can take a few minutes)...")
                result = subprocess.run(
                    [sys.executable, "-m", "train_model", "--no-shap"],
                    cwd=str(Path(__file__).resolve().parents[2]),
                    capture_output=True,
                    text=True,
                    timeout=3600,
                )
                logger.info("Training pipeline exited with code %s", result.returncode)
                if result.returncode != 0:
                    logger.error("Training output tail: %s", result.stdout[-2000:] or result.stderr[-2000:])
            else:
                logger.info(
                    "No dataset at %s — API will serve the honest 'unavailable' model state. "
                    "Place creditcard.csv there and run `python train_model.py`.",
                    data_path,
                )
        except Exception:
            logger.exception("Automatic training failed; serving unavailable state")
        reg = registry.resolve()
        if reg is not None and reg.loaded:
            self._load(reg)

    def _load(self, reg: RegisteredModel) -> None:
        if self._loaded_version == reg.version and self._estimator is not None:
            return
        try:
            self._estimator = XGBFraudModel.load(reg.model_path)
        except Exception:
            logger.exception("Failed to load model %s", reg.version)
            self._estimator = None
        if reg.preprocessor_path and reg.preprocessor_path.exists():
            self._preprocessor = FeaturePreprocessor.load(reg.preprocessor_path)
        if reg.background_path and reg.background_path.exists():
            self._background = np.load(reg.background_path)
        self._explainer = None  # rebuilt lazily after reload
        self._loaded_version = reg.version
        logger.info("Model %s loaded (estimator=%s, preprocessor=%s)",
                    reg.version, self._estimator is not None, self._preprocessor is not None)

    def ensure_loaded(self) -> RegisteredModel:
        reg = registry.resolve()
        if reg is None or not reg.loaded:
            raise RuntimeError(MODEL_UNAVAILABLE_MSG)
        self._load(reg)
        if self._estimator is None or self._preprocessor is None:
            raise RuntimeError(MODEL_UNAVAILABLE_MSG)
        return reg

    # ── Inference ──────────────────────────────────────────────────────────
    def _features_from_amount_time(self, features: dict, amount: float, time_hour: float | None) -> pd.DataFrame:
        """Build the engineered DataFrame for one transaction."""
        record = dict(features)
        record["Amount"] = float(amount)
        record["Time"] = float(time_hour) * 3600.0 if time_hour is not None else 0.0
        return engineer_features(pd.DataFrame([record]))

    def predict(self, features: dict, amount: float, time_hour: float | None = None) -> dict:
        reg = self.ensure_loaded()
        X = self._preprocessor.transform(self._features_from_amount_time(features, amount, time_hour))
        probability = float(self._estimator.predict_proba(X)[0])

        threshold = float(reg.thresholds.get("best_threshold", 0.5))
        prediction = "fraud" if probability >= threshold else "legit"
        risk_config = RiskConfig(**{
            k: v for k, v in (reg.risk or RISK_CONFIG.as_dict()).items()
            if k in ("low_cut", "high_cut")
        })
        risk = risk_config.categorize(probability)
        return {
            "fraud_probability": probability,
            "prediction": prediction,
            "risk_category": risk,
            "decision_threshold": threshold,
            "threshold_selected_by": reg.thresholds.get("selected_by", "max_f1"),
            "model_version": reg.version,
            "risk_bands": risk_config.as_dict(),
        }

    # ── Explainability ─────────────────────────────────────────────────────
    def _get_explainer(self):
        reg = registry.resolve()
        if self._explainer is None and reg is not None and self._background is not None:
            try:
                self._explainer = build_explainer(self._estimator.estimator, self._background)
            except Exception:
                logger.exception("SHAP explainer unavailable")
                self._explainer = None
        return self._explainer

    def explain(self, features: dict, amount: float, time_hour: float | None) -> dict:
        reg = self.ensure_loaded()
        explainer = self._get_explainer()
        df_features = self._features_from_amount_time(features, amount, time_hour)

        out = {
            "available": explainer is not None,
            "method": "TreeExplainer (model_output=probability)" if explainer is not None else None,
            "model_version": reg.version,
            "note": "SHAP values explain the model output; they are not evidence of causation.",
        }
        if explainer is None:
            return out

        X = self._preprocessor.transform(df_features)
        values = df_features[FEATURE_COLUMNS].to_dict(orient="records")[0]
        local = local_explanation(
            explainer,
            X[0],
            FEATURE_COLUMNS,
            values,
        )
        probability = float(local["predicted_probability"])
        out.update({
            "base_value": local["base_value"],
            "predicted_probability": probability,
            "human_readable": summarize(local["contributions"], probability),
            "contributions": local["contributions"],
            "feature_columns": FEATURE_COLUMNS,
        })
        return out


model_service = ModelService()
