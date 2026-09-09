"""XGBoost classifier with explicit scale_pos_weight support.

scale_pos_weight is computed from the TRAINING classes when not provided:

    scale_pos_weight = count(negative) / count(positive)

which roughly equalizes the gradient contribution of each class — the
standard approach for heavily imbalanced fraud data.
"""
from __future__ import annotations

import joblib
import numpy as np
from xgboost import XGBClassifier

from app.fraud_detector.config import ModelConfig


def compute_scale_pos_weight(y: np.ndarray) -> float:
    neg = float((y == 0).sum())
    pos = float((y == 1).sum())
    if pos == 0:
        return 1.0
    return float(max(neg, 1.0) / pos)


class XGBFraudModel:
    def __init__(self, config: ModelConfig | None = None) -> None:
        cfg = (config or ModelConfig()).xgb
        self.config = dict(cfg)
        self.estimator = XGBClassifier(
            n_estimators=cfg["n_estimators"],
            max_depth=cfg["max_depth"],
            learning_rate=cfg["learning_rate"],
            subsample=cfg["subsample"],
            colsample_bytree=cfg["colsample_bytree"],
            reg_alpha=cfg["reg_alpha"],
            reg_lambda=cfg["reg_lambda"],
            scale_pos_weight=cfg.get("scale_pos_weight") or 1.0,
            random_state=cfg["random_state"],
            tree_method=cfg.get("tree_method", "hist"),
            eval_metric=cfg.get("eval_metric", "aucpr"),
            n_jobs=-1,
            verbosity=0,
        )

    def fit(self, X: np.ndarray, y: np.ndarray) -> "XGBFraudModel":
        self.config["scale_pos_weight"] = compute_scale_pos_weight(y)
        self.estimator.set_params(scale_pos_weight=self.config["scale_pos_weight"])
        self.estimator.fit(X, y)
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.estimator.predict_proba(X)[:, 1]

    def save(self, path) -> None:
        joblib.dump({"config": self.config, "estimator": self.estimator}, path)

    @classmethod
    def load(cls, path) -> "XGBFraudModel":
        bundle = joblib.load(path)
        m = cls.__new__(cls)
        m.config = bundle["config"]
        m.estimator = bundle["estimator"]
        return m
