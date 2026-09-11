"""Dataset validation and quality reporting.

Reusable checks used by both `train_model.py` and the tests:
schema, dtypes, missing values, duplicates, infinities, target validity,
class distribution, leakage risk detection and a machine-readable summary.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from app.fraud_detector.config import RAW_COLUMNS, TARGET


@dataclass
class QualityReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return not self.errors

    def to_dict(self) -> dict:
        return {"ok": self.ok, "errors": self.errors, "warnings": self.warnings, "stats": self.stats}


def validate_schema(df: pd.DataFrame) -> list[str]:
    missing = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing:
        return [f"Missing required columns: {missing}"]
    extra = [c for c in df.columns if c not in RAW_COLUMNS]
    if extra:
        return [f"Unexpected extra columns: {extra}"]
    return []


def validate_dtypes(df: pd.DataFrame) -> list[str]:
    errors: list[str] = []
    for col in RAW_COLUMNS:
        if not np.issubdtype(df[col].dtype, np.number):
            errors.append(f"Column {col!r} is not numeric (dtype {df[col].dtype})")
    return errors


def validate_target(df: pd.DataFrame) -> list[str]:
    if df[TARGET].isna().any():
        return [f"Target column {TARGET!r} contains nulls"]
    vals = set(df[TARGET].unique())
    if not vals.issubset({0, 1}):
        return [f"Target column {TARGET!r} must contain only 0/1, found {sorted(vals)}"]
    return []


def assess_quality(df: pd.DataFrame) -> QualityReport:
    """Full quality assessment of a raw dataset frame."""
    report = QualityReport()

    report.errors.extend(validate_schema(df))
    if report.errors:
        return report  # can't continue meaningfully without the schema

    report.errors.extend(validate_dtypes(df))
    report.errors.extend(validate_target(df))
    if report.errors:
        return report

    numeric = df.select_dtypes(include=np.number)
    missing = numeric.isna().sum()
    if missing.sum() > 0:
        cols = [c for c, v in missing.items() if v > 0]
        report.errors.append(f"Missing values found in: {cols} (total {int(missing.sum())})")

    inf_count = int(np.isinf(numeric.to_numpy(dtype=float)).sum()) if numeric.size else 0
    if inf_count:
        report.errors.append(f"Non-finite (infinite) values found: {inf_count}")

    dup = int(df.duplicated().sum())
    if dup:
        report.warnings.append(f"{dup} exact duplicate rows (full-row duplicates)")

    n = len(df)
    frauds = int(df[TARGET].sum())
    legit = n - frauds
    ratio = (frauds / n) if n else 0.0
    report.warnings.append(
        f"Class imbalance: {frauds} frauds vs {legit} legitimate "
        f"(fraud rate {ratio*100:.3f}%). This is the central modeling challenge."
    )

    # Outlier inspection on Amount (report only; no deletion — outliers are signal)
    q1, q3 = df["Amount"].quantile([0.25, 0.75])
    iqr = q3 - q1
    upper = q3 + 3 * iqr
    n_amount_out = int((df["Amount"] > upper).sum())
    report.stats["amount_outliers_iqr_upper"] = float(upper)
    report.stats["amount_outliers_count"] = n_amount_out
    report.warnings.append(
        f"Amount outliers (> Q3 + 3*IQR = {upper:.2f}): {n_amount_out} rows "
        "(retained — high amounts are fraud-relevant, not noise)"
    )

    # Leakage checks: target-vs-feature dependency and duplicated feature variance
    corr_target = df[RAW_COLUMNS].corrwith(df[TARGET]).abs().sort_values(ascending=False)
    top_corr = float(corr_target.drop(TARGET, errors="ignore").iloc[0]) if len(corr_target) > 1 else 0.0
    if top_corr > 0.9:
        report.errors.append(
            f"Potential label leakage: a feature correlates with target at |r|={top_corr:.3f}"
        )
    report.stats["max_abs_target_corr"] = top_corr
    report.stats["top_correlated_feature"] = str(corr_target.index[0])

    report.stats.update(
        {
            "rows": n,
            "columns": list(df.columns),
            "fraud_count": frauds,
            "legit_count": legit,
            "fraud_rate": float(ratio),
            "missing_values_total": int(missing.sum()),
            "duplicate_rows": dup,
            "amount_mean": float(df["Amount"].mean()),
            "amount_min": float(df["Amount"].min()),
            "amount_max": float(df["Amount"].max()),
            "time_max_seconds": float(df["Time"].max()),
        }
    )
    return report
