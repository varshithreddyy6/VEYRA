"""Figures and machine-readable evaluation reports.

Every figure is generated from real predictions — nothing is drawn when the
model or dataset is absent. All outputs go under results/figures/ and
results/reports/ (git-ignored, regenerable).
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # headless-safe; must be set before pyplot import
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import auc, confusion_matrix, precision_recall_curve, roc_curve

from app.fraud_detector.config import RESULTS_FIGURES, RESULTS_REPORTS
from app.fraud_detector.evaluation.threshold import threshold_sweep

logger = logging.getLogger("fraud.reporting")

PALETTE = {"bg": "#0F1017", "card": "#1E2035", "text": "#C1C2D1", "red": "#F6153C", "green": "#22C55E"}


def _style_ax(ax, title: str) -> None:
    ax.set_facecolor(PALETTE["card"])
    ax.set_title(title, color=PALETTE["text"], fontsize=11, pad=10)
    ax.tick_params(colors=PALETTE["text"], labelsize=8)
    for spine in ax.spines.values():
        spine.set_color("#3A3D55")
    ax.grid(True, alpha=0.15)


def plot_roc_curve(y_true, y_prob, save_path: Path) -> Path:
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    roc_auc = auc(fpr, tpr)
    fig, ax = plt.subplots(figsize=(6, 5), facecolor=PALETTE["bg"])
    ax.plot(fpr, tpr, color=PALETTE["green"], lw=2, label=f"ROC (AUC = {roc_auc:.4f})")
    ax.plot([0, 1], [0, 1], color=PALETTE["text"], ls="--", lw=1, alpha=0.4)
    ax.set_xlabel("False Positive Rate", color=PALETTE["text"], fontsize=9)
    ax.set_ylabel("True Positive Rate", color=PALETTE["text"], fontsize=9)
    _style_ax(ax, "ROC Curve — test set")
    ax.legend(facecolor=PALETTE["card"], edgecolor="#3A3D55", labelcolor=PALETTE["text"], fontsize=8)
    fig.tight_layout()
    fig.savefig(save_path, dpi=130, facecolor=PALETTE["bg"])
    plt.close(fig)
    return save_path


def plot_pr_curve(y_true, y_prob, save_path: Path) -> Path:
    precision, recall, _ = precision_recall_curve(y_true, y_prob)
    pr_auc = auc(recall, precision)
    fig, ax = plt.subplots(figsize=(6, 5), facecolor=PALETTE["bg"])
    ax.plot(recall, precision, color=PALETTE["red"], lw=2, label=f"PR (AUC = {pr_auc:.4f})")
    baseline = float(np.mean(y_true))
    ax.axhline(baseline, color=PALETTE["text"], ls="--", lw=1, alpha=0.5,
               label=f"No-skill baseline = {baseline:.4f}")
    ax.set_xlabel("Recall", color=PALETTE["text"], fontsize=9)
    ax.set_ylabel("Precision", color=PALETTE["text"], fontsize=9)
    ax.set_ylim(0, 1.05)
    _style_ax(ax, "Precision-Recall Curve — test set")
    ax.legend(facecolor=PALETTE["card"], edgecolor="#3A3D55", labelcolor=PALETTE["text"], fontsize=8)
    fig.tight_layout()
    fig.savefig(save_path, dpi=130, facecolor=PALETTE["bg"])
    plt.close(fig)
    return save_path


def plot_confusion_matrix(y_true, y_prob, threshold: float, save_path: Path) -> Path:
    y_pred = (np.asarray(y_prob) >= threshold).astype(int)
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    fig, ax = plt.subplots(figsize=(5, 4.2), facecolor=PALETTE["bg"])
    im = ax.imshow(cm, cmap="RdYlGn", interpolation="nearest")
    labels = [["TN", "FP"], ["FN", "TP"]]
    for i in range(2):
        for j in range(2):
            ax.text(j, i, f"{labels[i][j]}\n{cm[i, j]}", ha="center", va="center", fontsize=12,
                    color="black" if abs(cm[i, j]) > cm.max() * 0.5 else PALETTE["text"])
    ax.set_xticks([0, 1], ["Predicted legit", "Predicted fraud"], color=PALETTE["text"], fontsize=8)
    ax.set_yticks([0, 1], ["Actual legit", "Actual fraud"], color=PALETTE["text"], fontsize=8)
    _style_ax(ax, f"Confusion Matrix @ {threshold:.3f}")
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    fig.savefig(save_path, dpi=130, facecolor=PALETTE["bg"])
    plt.close(fig)
    return save_path


def plot_threshold_sweep(y_true, y_prob, chosen: float, save_path: Path) -> Path:
    sweep = threshold_sweep(y_true, y_prob, n_points=120)
    fig, ax = plt.subplots(figsize=(7, 4.6), facecolor=PALETTE["bg"])
    ax.plot(sweep["threshold"], sweep["precision"], color=PALETTE["green"], lw=1.6, label="Precision")
    ax.plot(sweep["threshold"], sweep["recall"], color=PALETTE["red"], lw=1.6, label="Recall")
    ax.plot(sweep["threshold"], sweep["f1"], color="#F59E0B", lw=1.6, label="F1")
    ax.axvline(chosen, color="#C1C2D1", ls="--", lw=1.2, label=f"Selected = {chosen:.3f}")
    ax.set_xlabel("Decision threshold", color=PALETTE["text"], fontsize=9)
    ax.set_ylabel("Score", color=PALETTE["text"], fontsize=9)
    _style_ax(ax, "Threshold sweep (validation)")
    ax.legend(facecolor=PALETTE["card"], edgecolor="#3A3D55", labelcolor=PALETTE["text"], fontsize=8)
    fig.tight_layout()
    fig.savefig(save_path, dpi=130, facecolor=PALETTE["bg"])
    plt.close(fig)
    return save_path


def write_json_report(data: dict, name: str, directory: Path | None = None) -> Path:
    directory = directory or RESULTS_REPORTS
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}.json"
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    return path


def write_figures(y_true, y_prob, threshold: float, tag: str) -> dict[str, str]:
    """Write the standard evaluation figures; returns their relative paths."""
    figures_dir = RESULTS_FIGURES / tag
    figures_dir.mkdir(parents=True, exist_ok=True)
    out: dict[str, str] = {}
    out["roc_curve"] = str(plot_roc_curve(y_true, y_prob, figures_dir / "roc_curve.png"))
    out["pr_curve"] = str(plot_pr_curve(y_true, y_prob, figures_dir / "pr_curve.png"))
    out["confusion_matrix"] = str(
        plot_confusion_matrix(y_true, y_prob, threshold, figures_dir / "confusion_matrix.png")
    )
    out["threshold_sweep"] = str(plot_threshold_sweep(y_true, y_prob, threshold, figures_dir / "threshold_sweep.png"))
    logger.info("Figures written to %s", figures_dir)
    return out
