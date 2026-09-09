"""Rare-event-friendly evaluation metrics.

Accuracy is reported but never used as the selection criterion — with a
0.2% fraud rate, a constant-0 model still achieves ~99.8% accuracy.
PR-AUC, recall, precision, F1 and ROC-AUC are the meaningful numbers here.
"""
from __future__ import annotations

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)


def compute_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> dict:
    y_true = np.asarray(y_true, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)
    y_pred = (y_prob >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()

    metrics = {
        "threshold": float(threshold),
        "true_positive": int(tp),
        "false_positive": int(fp),
        "true_negative": int(tn),
        "false_negative": int(fn),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_true, y_prob)),
        "pr_auc": float(average_precision_score(y_true, y_prob)),
        "fraud_count": int(y_true.sum()),
        "legit_count": int((y_true == 0).sum()),
    }
    metrics["confusion_matrix"] = {
        "true_negative": tn,
        "false_positive": fp,
        "false_negative": fn,
        "true_positive": tp,
    }
    return metrics


def business_cost(y_true: np.ndarray, y_pred: np.ndarray, fp_cost: float, fn_cost: float) -> float:
    """Total cost = fp_cost * FP + fn_cost * FN (raised to the product).

    FP = legitimate transaction blocked/reviewed unnecessarily.
    FN = fraud missed entirely (the expensive error in card fraud).
    """
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    return float(fp_cost * fp + fn_cost * fn)
