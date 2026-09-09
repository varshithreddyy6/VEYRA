"""Exploratory Data Analysis.

All figures are produced from the real dataset at training time and stored
under results/figures/eda/. If the dataset is unavailable, this module is
never invoked — no placeholder plots are ever generated.
"""
from __future__ import annotations

import logging
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from scipy import stats  # noqa: E402

from app.fraud_detector.config import RESULTS_FIGURES

logger = logging.getLogger("fraud.eda")

STYLE = {"bg": "#0F1017", "card": "#1E2035", "text": "#C1C2D1", "red": "#F6153C", "green": "#22C55E"}


def _style(ax, title: str) -> None:
    ax.set_facecolor(STYLE["card"])
    ax.set_title(title, color=STYLE["text"], fontsize=10, pad=8)
    ax.tick_params(colors=STYLE["text"], labelsize=7)
    for s in ax.spines.values():
        s.set_color("#3A3D55")
    ax.grid(True, alpha=0.12)


def run_eda(df: pd.DataFrame, tag: str = "eda") -> dict:
    out_dir = RESULTS_FIGURES / tag
    out_dir.mkdir(parents=True, exist_ok=True)
    summary: dict = {}
    fraud = df[df["Class"] == 1]
    legit = df[df["Class"] == 0]

    # 1 — class distribution
    fig, ax = plt.subplots(figsize=(4.6, 3.6), facecolor=STYLE["bg"])
    counts = df["Class"].value_counts().sort_index()
    ax.bar(["Legitimate", "Fraud"], counts.values, color=[STYLE["green"], STYLE["red"]])
    for i, v in enumerate(counts.values):
        ax.text(i, v, f"{v:,}", ha="center", va="bottom", color=STYLE["text"], fontsize=8)
    _style(ax, "Class distribution")
    fig.tight_layout(); fig.savefig(out_dir / "class_distribution.png", dpi=130, facecolor=STYLE["bg"]); plt.close(fig)

    # 2 — amount distribution (log scale) by class
    fig, ax = plt.subplots(figsize=(6.5, 3.8), facecolor=STYLE["bg"])
    bins = np.logspace(0, 4, 60)
    ax.hist(legit["Amount"], bins=bins, alpha=0.65, color=STYLE["green"], label="Legitimate")
    ax.hist(fraud["Amount"], bins=bins, alpha=0.85, color=STYLE["red"], label="Fraud")
    ax.set_xscale("log"); ax.set_xlabel("Amount (log scale)", color=STYLE["text"], fontsize=8)
    ax.set_ylabel("Count", color=STYLE["text"], fontsize=8)
    _style(ax, "Transaction amount distribution by class")
    ax.legend(facecolor=STYLE["card"], edgecolor="#3A3D55", labelcolor=STYLE["text"], fontsize=8)
    fig.tight_layout(); fig.savefig(out_dir / "amount_distribution.png", dpi=130, facecolor=STYLE["bg"]); plt.close(fig)

    # 3 — time-of-day pattern (dataset Time is an offset; treat as 24h cycle)
    hour = (df["Time"] % 86400) / 3600
    fig, ax = plt.subplots(figsize=(6.5, 3.8), facecolor=STYLE["bg"])
    ax.hist(hour[df["Class"] == 1], bins=24, color=STYLE["red"], alpha=0.85, label="Fraud")
    ax.hist(hour[df["Class"] == 0], bins=24, color=STYLE["green"], alpha=0.35, label="Legitimate")
    ax.set_xlabel("Hour of day (mod 24 of Time offset)", color=STYLE["text"], fontsize=8)
    ax.set_ylabel("Count", color=STYLE["text"], fontsize=8)
    _style(ax, "Time-of-day activity pattern")
    ax.legend(facecolor=STYLE["card"], edgecolor="#3A3D55", labelcolor=STYLE["text"], fontsize=8)
    fig.tight_layout(); fig.savefig(out_dir / "time_pattern.png", dpi=130, facecolor=STYLE["bg"]); plt.close(fig)

    # 4 — correlation heatmap (V features + Amount + Time)
    corr_cols = [f"V{i}" for i in range(1, 29)] + ["Amount", "Time"]
    corr = df[corr_cols].corr()
    fig, ax = plt.subplots(figsize=(9, 7.4), facecolor=STYLE["bg"])
    im = ax.imshow(corr.values, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(corr_cols)), corr_cols, rotation=90, fontsize=6, color=STYLE["text"])
    ax.set_yticks(range(len(corr_cols)), corr_cols, fontsize=6, color=STYLE["text"])
    _style(ax, "Feature correlation heatmap")
    fig.colorbar(im, ax=ax, fraction=0.03)
    fig.tight_layout(); fig.savefig(out_dir / "correlation_heatmap.png", dpi=130, facecolor=STYLE["bg"]); plt.close(fig)

    # 5 — fraud-specific feature patterns: top-6 features by |corr with target|
    corr_target = df[[f"V{i}" for i in range(1, 29)] + ["Amount"]].corrwith(df["Class"]).abs().sort_values(ascending=False)
    top6 = corr_target.head(6).index.tolist()
    fig, axes = plt.subplots(2, 3, figsize=(9, 5.2), facecolor=STYLE["bg"])
    for ax, col in zip(axes.ravel(), top6):
        for cls, color, label in ((1, STYLE["red"], "Fraud"), (0, STYLE["green"], "Legit")):
            data = df.loc[df["Class"] == cls, col]
            ax.hist(data, bins=40, alpha=0.55, color=color, label=label, density=True)
        ax.set_title(f"{col} (|r|={corr_target[col]:.2f})", color=STYLE["text"], fontsize=8)
        ax.tick_params(colors=STYLE["text"], labelsize=6)
        ax.set_facecolor(STYLE["card"]); ax.grid(True, alpha=0.1)
    fig.suptitle("Feature distributions: fraud vs legitimate", color=STYLE["text"], fontsize=10)
    fig.tight_layout(); fig.savefig(out_dir / "feature_patterns.png", dpi=130, facecolor=STYLE["bg"]); plt.close(fig)

    # Statistical summary (computed, not invented)
    summary = {
        "rows": int(len(df)),
        "fraud_count": int(len(fraud)),
        "legit_count": int(len(legit)),
        "fraud_rate": float(len(fraud) / len(df)),
        "amount_mean": float(df["Amount"].mean()),
        "amount_median": float(df["Amount"].median()),
        "fraud_amount_mean": float(fraud["Amount"].mean()),
        "legit_amount_mean": float(legit["Amount"].mean()),
        "amount_ks_stat": float(stats.ks_2samp(fraud["Amount"], legit["Amount"]).statistic),
        "top_correlated_features": {str(k): float(v) for k, v in corr_target.head(8).items()},
        "time_max_seconds": float(df["Time"].max()),
        "figures_dir": str(out_dir),
    }
    logger.info("EDA summary computed and figures saved to %s", out_dir)
    return summary
