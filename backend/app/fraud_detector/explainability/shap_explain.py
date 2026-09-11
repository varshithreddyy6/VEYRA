"""SHAP explanations for the XGBoost model.

``TreeExplainer`` with ``model_output="probability"`` produces additive
explanations in units of fraud probability: each feature's SHAP value is the
size of its contribution to the model score for that transaction.

IMPORTANT (stated in the UI too): SHAP explains the MODEL. It is not evidence
of causality, and for PCA-transformed features it cannot identify which
real-world behaviour drove the signal.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import shap  # noqa: E402


logger = logging.getLogger("fraud.shap")

MAX_GLOBAL_ROWS = 1000  # cap for the summary sample (runtime vs accuracy trade-off)


def build_explainer(model, background: np.ndarray):
    """TreeExplainer uses a small interventional background sample."""
    return shap.TreeExplainer(model, data=background, model_output="probability", feature_perturbation="interventional")


def global_explanation(explainer, X_sample: np.ndarray, feature_labels: list[str], n_features: int = 28) -> dict:
    """Mean |SHAP| per feature ordered descending + formatted importance list."""
    values = explainer.shap_values(X_sample)
    values = np.asarray(values, dtype=float)
    if values.ndim == 3:  # multi-output edge case
        values = values[:, :, 0]

    mean_abs = np.abs(values).mean(axis=0)
    order = np.argsort(mean_abs)[::-1]

    top: list[dict] = []
    for idx in order[:n_features]:
        col = values[:, idx]
        feature = feature_labels[idx]
        direction = "positive" if mean_abs[idx] > 0 and col.mean() >= 0 else "negative"
        top.append(
            {
                "rank": int(np.where(order == idx)[0][0]) + 1,
                "feature": feature,
                "mean_abs_shap": float(mean_abs[idx]),
                "mean_shap": float(col.mean()),
                "direction": direction,
            }
        )
    return {"features": top, "explainer_method": "TreeExplainer", "units": "fraud probability (log-odds scaled)"}


def local_explanation(explainer, row: np.ndarray, feature_labels: list[str], feature_values: dict) -> dict:
    """Per-feature contributions for one transaction."""
    values = explainer.shap_values(row.reshape(1, -1))
    values = np.asarray(values, dtype=float).reshape(-1)
    base = float(explainer.expected_value)
    if np.ndim(base) > 0:
        base = float(np.squeeze(base))

    order = np.argsort(np.abs(values))[::-1]
    contributions: list[dict] = []
    for idx in order:
        if idx >= len(feature_labels):
            continue
        v = float(values[idx])
        contributions.append(
            {
                "feature": feature_labels[idx],
                "value": float(feature_values.get(feature_labels[idx], np.nan)),
                "shap_value": v,
                "direction": "increases_fraud_risk" if v >= 0 else "decreases_fraud_risk",
                "magnitude": float(abs(v)),
            }
        )
    return {
        "base_value": base,
        "sum_of_shap": float(values.sum()),
        "predicted_probability": float(base + values.sum()),
        "contributions": contributions,
    }


def summarize(contributions: list[dict], probability: float) -> str:
    """Short human-readable summary of the top contributions."""
    if not contributions:
        return "No contribution data available for this transaction."
    rising = [c for c in contributions if c["direction"] == "increases_fraud_risk"]
    falling = [c for c in contributions if c["direction"] == "decreases_fraud_risk"]
    top_up = ", ".join(f"{c['feature']} ({c['shap_value']:+.3f})" for c in rising[:3]) or "none"
    top_down = ", ".join(f"{c['feature']} ({c['shap_value']:+.3f})" for c in falling[:3]) or "none"
    return (
        f"The model scored this transaction at {probability*100:.1f}% fraud probability. "
        f"The strongest upward contributors were {top_up}; "
        f"the strongest downward contributors were {top_down}. "
        "This describes the model's reasoning, not proof of fraud."
    )


def shap_summary_plot(explainer, X_sample: np.ndarray, feature_labels: list[str], save_path: Path) -> Path:
    """Beeswarm summary plot (global importance visual)."""
    save_path.parent.mkdir(parents=True, exist_ok=True)
    fig = plt.figure(figsize=(9, 6))
    shap.summary_plot(explainer.shap_values(X_sample), X_sample, feature_names=feature_labels, show=False)
    fig.savefig(save_path, dpi=130, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return save_path


def save_global_json(data: dict, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return path
