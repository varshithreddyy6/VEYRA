"""Central ML pipeline configuration. Single source of truth for feature and
risk definitions shared by training, the API and the rule engine.

Risk thresholds are intentionally centralized here — no other module hard-
codes LOW/MEDIUM/HIGH boundaries.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# ── Paths (project-root relative; overridable via env vars) ────────────────
# FRAUD_ARTIFACTS_DIR / FRAUD_DATA_DIR / FRAUD_RESULTS_DIR let CI and tests
# redirect outputs to isolated directories. Nothing here is absolute.
PROJECT_ROOT: Path = Path(__file__).resolve().parents[2]  # backend/
REPO_ROOT: Path = PROJECT_ROOT.parent                      # repository root


def _env_path(name: str, default: Path) -> Path:
    value = os.environ.get(name)
    return Path(value) if value else default


ARTIFACTS_ROOT: Path = _env_path("FRAUD_ARTIFACTS_DIR", REPO_ROOT / "artifacts")
DATA_ROOT: Path = _env_path("FRAUD_DATA_DIR", REPO_ROOT / "data")
RESULTS_ROOT: Path = _env_path("FRAUD_RESULTS_DIR", REPO_ROOT / "results")

DATA_RAW: Path = DATA_ROOT / "raw" / "creditcard.csv"
DATA_PROCESSED: Path = DATA_ROOT / "processed"
ARTIFACTS_MODELS: Path = ARTIFACTS_ROOT / "models"
ARTIFACTS_PREPROCESSING: Path = ARTIFACTS_ROOT / "preprocessing"
ARTIFACTS_METRICS: Path = ARTIFACTS_ROOT / "metrics"
ARTIFACTS_EXPLAINABILITY: Path = ARTIFACTS_ROOT / "explainability"
RESULTS_FIGURES: Path = RESULTS_ROOT / "figures"
RESULTS_REPORTS: Path = RESULTS_ROOT / "reports"

# ── Columns ────────────────────────────────────────────────────────────────
RAW_AMOUNT: str = "Amount"
RAW_TIME: str = "Time"
TARGET: str = "Class"
PRINCIPAL_FEATURES: list[str] = [f"V{i}" for i in range(1, 29)]  # V1..V28
RAW_COLUMNS: list[str] = [RAW_TIME, *PRINCIPAL_FEATURES, RAW_AMOUNT, TARGET]

# Engineered feature names (must match features/build.py exactly)
HOUR_SIN: str = "Hour_sin"
HOUR_COS: str = "Hour_cos"
AMOUNT_LOG: str = "Amount_log1p"
FEATURE_COLUMNS: list[str] = [*PRINCIPAL_FEATURES, HOUR_SIN, HOUR_COS, AMOUNT_LOG]


@dataclass(frozen=True)
class RiskConfig:
    """Cut points for the screening categories.

    Fraud probability is in [0, 1]. A transaction is:
      LOW    — probability < low_cut
      MEDIUM — low_cut <= probability < high_cut
      HIGH   — probability >= high_cut
    These are model screening bands, not automated banking decisions.
    """

    low_cut: float = 0.30
    high_cut: float = 0.70

    def categorize(self, probability: float) -> str:
        if probability < self.low_cut:
            return "LOW"
        if probability < self.high_cut:
            return "MEDIUM"
        return "HIGH"

    def as_dict(self) -> dict[str, float]:
        return {"low_cut": self.low_cut, "high_cut": self.high_cut}


@dataclass
class Thresholds:
    """Selected operating points, found on VALIDATION data only."""

    best_threshold: float = 0.50
    max_f1: float = 0.50
    min_recall: float = 0.50
    min_precision: float = 0.50
    business_cost: float = 0.50
    selected_by: str = "max_f1"

    def as_dict(self) -> dict[str, float | str]:
        return {
            "best_threshold": self.best_threshold,
            "max_f1": self.max_f1,
            "min_recall": self.min_recall,
            "min_precision": self.min_precision,
            "business_cost": self.business_cost,
            "selected_by": self.selected_by,
        }


@dataclass
class ModelConfig:
    """Reproducible training configuration. Every XGBoost run seeds identically."""

    random_state: int = 42
    test_size: float = 0.20
    val_ratio_of_train: float = 0.20

    baseline: dict = field(
        default_factory=lambda: {
            "C": 1.0,
            "max_iter": 2000,
            "class_weight": "balanced",
            "solver": "liblinear",
        }
    )
    xgb: dict = field(
        default_factory=lambda: {
            "n_estimators": 300,
            "max_depth": 5,
            "learning_rate": 0.05,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "reg_alpha": 0.1,
            "reg_lambda": 3.0,
            "scale_pos_weight": None,  # filled automatically from class imbalance
            "random_state": 42,
            "tree_method": "hist",
            "eval_metric": "aucpr",
            "use_label_encoder": False,
        }
    )

    # Hyperparameter search (RandomizedSearchCV, kept small for local machines)
    tuning: dict = field(
        default_factory=lambda: {
            "enabled": True,
            "n_iter": 12,
            "cv": 3,
            "scoring": "average_precision",  # PR-AUC: rare-event appropriate
            "param_grid": {
                "n_estimators": [200, 300],
                "max_depth": [4, 5, 6],
                "learning_rate": [0.02, 0.05, 0.1],
                "subsample": [0.8, 0.9],
                "colsample_bytree": [0.7, 0.9],
            },
        }
    )


@dataclass
class RuleConfig:
    """Deterministic screening signals. Every flag is human-readable and
    recorded with the screening — flags are separate from ML probability."""

    high_amount_usd: float = 2000.0
    night_start_hour: int = 23
    night_end_hour: int = 5
    night_high_amount_usd: float = 1000.0
    velocity_window_hours: float = 6.0
    velocity_max_attempts: int = 3
    time_horizon_hours: float = 12.0
    time_high_amount_usd: float = 500.0


RISK_CONFIG = RiskConfig()
DEFAULT_MODEL_CONFIG = ModelConfig()
DEFAULT_RULE_CONFIG = RuleConfig()
