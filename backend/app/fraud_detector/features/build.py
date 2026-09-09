"""Deterministic feature engineering.

The SAME code path runs at training time and at inference time. Nothing here
depends on the training set except the two scalers (StandardScaler on V1..V28,
RobustScaler on Amount_log1p) which are fitted on the training data and stored
as artifacts under artifacts/preprocessing/.

Transforms:
    Hour_sin / Hour_cos — the dataset's ``Time`` column is an offset in seconds
    from the first transaction, so it is normalized to [0,24h) and encoded
    circularly. Circular encoding keeps the 23:00/01:00 wraparound continuous.
    Amount_log1p       — log1p compresses the heavy-tailed amount distribution.

``features/__init__.py`` re-exports get_feature_columns() so no other module
hard-codes the engineered feature list.
"""
from __future__ import annotations

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import RobustScaler, StandardScaler

from app.fraud_detector.config import (
    AMOUNT_LOG,
    HOUR_COS,
    HOUR_SIN,
    PRINCIPAL_FEATURES,
)

logger = logging.getLogger("fraud.features")

# Engineered column order — canonical and shared by training and inference.
FEATURE_COLUMNS: list[str] = [*PRINCIPAL_FEATURES, HOUR_SIN, HOUR_COS, AMOUNT_LOG]


def get_feature_columns() -> list[str]:
    return list(FEATURE_COLUMNS)


def _time_to_hour(time_offset_seconds: float) -> float:
    """Dataset Time is seconds since the first transaction → hour of day [0,24)."""
    return (float(time_offset_seconds) % 86400.0) / 3600.0


def _fill_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Defensive fill; the API validator rejects nulls before they get here."""
    for col in [*PRINCIPAL_FEATURES, "Amount", "Time"]:
        if col in df.columns and df[col].isna().any():
            logger.warning("Imputing %d missing values in %s with the column median", df[col].isna().sum(), col)
            df[col] = df[col].fillna(df[col].median())
    return df


def engineer_features(raw: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering WITHOUT scaling — the raw engineered matrix.

    Used for SHAP (which wants original feature units) and for evaluation.
    """
    df = _fill_missing(raw.copy())

    if "Time" in df.columns:
        hour = df["Time"].map(_time_to_hour)
        df[HOUR_SIN] = np.sin(2.0 * np.pi * hour / 24.0)
        df[HOUR_COS] = np.cos(2.0 * np.pi * hour / 24.0)
    else:
        raise ValueError("Raw frame is missing the 'Time' column")

    if "Amount" in df.columns:
        df[AMOUNT_LOG] = np.log1p(df["Amount"].clip(lower=0.0))
    else:
        raise ValueError("Raw frame is missing the 'Amount' column")

    # Downstream consumers use only the engineered feature columns.
    df = df[FEATURE_COLUMNS]
    return df


class FeaturePreprocessor:
    """Fit + persist + apply the scaling pipeline (train == inference)."""

    def __init__(self) -> None:
        self.pipeline: Pipeline | None = None
        self.feature_columns = FEATURE_COLUMNS

    def fit(self, engineered_train: pd.DataFrame) -> "FeaturePreprocessor":
        numeric_features = [*PRINCIPAL_FEATURES]
        # Hour_sin/Hour_cos are already bounded in [-1, 1] and circular —
        # scaling them would break the wraparound interpretation, so they pass through.
        transformer = ColumnTransformer(
            transformers=[
                ("pca", StandardScaler(), numeric_features),
                ("circular", "passthrough", [HOUR_SIN, HOUR_COS]),
                ("amount", RobustScaler(quantile_range=(1.0, 99.0)), [AMOUNT_LOG]),
            ],
            remainder="drop",
        )
        self.pipeline = Pipeline([("scale", transformer)])
        self.pipeline.fit(engineered_train[self.feature_columns])
        return self

    def transform(self, engineered: pd.DataFrame) -> np.ndarray:
        if self.pipeline is None:
            raise RuntimeError("Preprocessor is not fitted")
        return self.pipeline.transform(engineered[self.feature_columns])

    # ── Persistence ────────────────────────────────────────────────────────
    def save(self, path: Path) -> Path:
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.pipeline, path)
        return path

    @classmethod
    def load(cls, path: Path) -> "FeaturePreprocessor":
        pp = cls()
        pp.pipeline = joblib.load(path)
        return pp
