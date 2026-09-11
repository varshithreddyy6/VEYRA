"""Class-weighted Logistic Regression baseline.

The baseline exists to be a fair, simple reference point: same features,
same splits, same evaluation. If XGBoost does not beat it on PR-AUC and
recall at the chosen threshold, the comparison report says so.
"""
from __future__ import annotations

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression

from app.fraud_detector.config import ModelConfig


class BaselineModel:
    def __init__(self, config: ModelConfig | None = None) -> None:
        base = (config or ModelConfig()).baseline
        self.estimator = LogisticRegression(
            C=base["C"],
            max_iter=base["max_iter"],
            class_weight=base["class_weight"],
            solver=base["solver"],
            random_state=base.get("random_state", 42),
        )

    def fit(self, X: np.ndarray, y: np.ndarray) -> "BaselineModel":
        self.estimator.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        proba = self.estimator.predict_proba(X)
        return proba[:, 1]

    def save(self, path) -> None:
        joblib.dump(self.estimator, path)

    @classmethod
    def load(cls, path) -> "BaselineModel":
        m = cls()
        m.estimator = joblib.load(path)
        return m
