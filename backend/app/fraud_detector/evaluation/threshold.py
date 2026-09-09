"""Threshold optimization on VALIDATION data only.

The default 0.5 is almost never optimal for rare-event fraud detection.
Four selection strategies are implemented:

    max_f1         — argmax of F1 across the sweep
    min_recall_085 — highest threshold that still keeps recall >= 0.85
    min_precision  — threshold achieving precision >= 0.5 at highest recall
    business_cost  — argmin of (fp_cost*FP + fn_cost*FN)

The chosen operating point is persisted and served through the API; the
test set is never touched while selecting it.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import f1_score, precision_score, recall_score

from app.fraud_detector.evaluation.metrics import business_cost
from app.fraud_detector.config import Thresholds


def threshold_sweep(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_points: int = 200,
    fp_cost: float = 1.0,
    fn_cost: float = 5.0,
) -> pd.DataFrame:
    """Evaluate every candidate threshold; returns one row per threshold."""
    y_true = np.asarray(y_true, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)

    grid = np.unique(np.concatenate([np.linspace(0.001, 0.999, n_points), [0.5]]))
    rows: dict[str, list] = {
        "threshold": [],
        "precision": [],
        "recall": [],
        "f1": [],
        "false_positive": [],
        "false_negative": [],
        "cost": [],
    }
    for t in grid:
        pred = (y_prob >= t).astype(int)
        rows["threshold"].append(float(t))
        rows["precision"].append(float(precision_score(y_true, pred, zero_division=0)))
        rows["recall"].append(float(recall_score(y_true, pred, zero_division=0)))
        rows["f1"].append(float(f1_score(y_true, pred, zero_division=0)))
        rows["false_positive"].append(int(((pred == 1) & (y_true == 0)).sum()))
        rows["false_negative"].append(int(((pred == 0) & (y_true == 1)).sum()))
        rows["cost"].append(business_cost(y_true, pred, fp_cost, fn_cost))
    return pd.DataFrame(rows)


def select_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    fp_cost: float = 1.0,
    fn_cost: float = 5.0,
    strategy: str = "max_f1",
    recall_target: float = 0.85,
    precision_target: float = 0.5,
) -> Thresholds:
    sweep = threshold_sweep(y_true, y_prob, fp_cost=fp_cost, fn_cost=fn_cost)

    def best_row(mask: pd.Series, criterion: str, maximize: bool = True) -> pd.Series:
        candidates = sweep[mask]
        if candidates.empty:
            return sweep.loc[sweep["f1"].idxmax()]  # graceful fallback
        if maximize:
            return candidates.loc[candidates[criterion].idxmax()]
        return candidates.loc[candidates[criterion].idxmin()]

    t = Thresholds()
    t.max_f1 = float(sweep.loc[sweep["f1"].idxmax(), "threshold"])
    t.min_recall = float(best_row(sweep["recall"] >= recall_target, "threshold", maximize=True)["threshold"])
    t.min_precision = float(
        best_row(sweep["precision"] >= precision_target, "recall", maximize=True)["threshold"]
    )
    t.business_cost = float(sweep.loc[sweep["cost"].idxmin(), "threshold"])

    chosen = {"max_f1": t.max_f1, "min_recall": t.min_recall, "min_precision": t.min_precision,
              "business_cost": t.business_cost}.get(strategy, t.max_f1)
    t.best_threshold = float(chosen)
    t.selected_by = str(strategy)
    return t
