#!/usr/bin/env python3
"""Training pipeline — CREDIT CARD FRAUD DETECTION SYSTEM.

Runs the complete reproducible workflow:

    data → quality → (EDA) → stratified split → features → baseline LR
         → XGBoost (+ optional randomized search) → threshold optimization
         (validation only) → final evaluation (test) → SHAP → artifacts

Usage (from backend/, venv active):

    python train_model.py                     # full run, PR-AUC-optimized tuning
    python train_model.py --strategy business_cost
    python train_model.py --no-tuning --no-shap --skip-eda   # fast demo run
    python train_model.py --data ../data/raw/creditcard.csv
    python train_model.py --fake             # SYNTHETIC data (demo/CI only)
    python train_model.py --target f1 --strategy max_f1

Outputs
-------
    artifacts/models/CCDFS-XGB-<ts>/…        served model bundle
    artifacts/preprocessing/…                scaler + SHAP background
    artifacts/metrics/<version>.json         machine-readable metrics
    artifacts/explainability/…               global summary
    results/figures/<tag>/…                  ROC/PR/confusion/threshold figures
    results/reports/training_<version>.json  full report
"""
from __future__ import annotations

import argparse
import logging
import platform
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd
from sklearn.model_selection import RandomizedSearchCV, StratifiedShuffleSplit

from app.core.logging import configure_logging
from app.fraud_detector.config import (
    ARTIFACTS_EXPLAINABILITY,
    DEFAULT_MODEL_CONFIG,
    RISK_CONFIG,
    Thresholds,
    TARGET,
)
from app.fraud_detector.data.eda import run_eda
from app.fraud_detector.data.loading import load_dataset
from app.fraud_detector.data.quality import assess_quality
from app.fraud_detector.evaluation.metrics import compute_metrics
from app.fraud_detector.evaluation.reporting import write_figures, write_json_report
from app.fraud_detector.evaluation.threshold import select_threshold, threshold_sweep
from app.fraud_detector.explainability.shap_explain import (
    build_explainer,
    global_explanation,
    save_global_json,
    shap_summary_plot,
)
from app.fraud_detector.features.build import FEATURE_COLUMNS, FeaturePreprocessor, engineer_features
from app.fraud_detector.models.baseline import BaselineModel
from app.fraud_detector.models.xgboost_model import XGBFraudModel
from app.fraud_detector.utils.artifacts import (
    ensure_dirs,
    save_metrics_copy,
    save_preprocessor,
    set_active_version,
    version_dir,
    version_now,
    write_json,
)
from app.fraud_detector.utils.seeds import set_global_seed
from app.fraud_detector.utils.synthetic import generate_synthetic

logger = logging.getLogger("fraud.train")

SEED = 42


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train the fraud detection model (XGBoost + LR baseline)")
    p.add_argument("--data", type=str, default=None, help="Path to creditcard.csv (default: data/raw/creditcard.csv)")
    p.add_argument("--fake", action="store_true", help="Use the SYNTHETIC demo dataset (tests/demos only)")
    p.add_argument("--target", type=str, default="pr_auc",
                   choices=["pr_auc", "recall", "f1"], help="Tuning/search target")
    p.add_argument("--strategy", type=str, default="max_f1",
                   choices=["max_f1", "min_recall", "min_precision", "business_cost"],
                   help="Threshold selection strategy (always applied on validation)")
    p.add_argument("--no-tuning", action="store_true", help="Skip RandomizedSearchCV")
    p.add_argument("--no-shap", action="store_true", help="Skip SHAP (faster, smaller artifacts)")
    p.add_argument("--skip-eda", action="store_true", help="Skip EDA figures")
    p.add_argument("--seed", type=int, default=SEED, help="Random seed (reproducibility)")
    p.add_argument("--tag", type=str, default=None, help="Extra tag for the figure directory")
    return p.parse_args(argv)


def load_frame(args: argparse.Namespace) -> tuple[pd.DataFrame, str]:
    """Returns (df, dataset_label). Raises SystemExit with guidance on failure."""
    if args.fake:
        logger.warning("Using SYNTHETIC data — metrics will reflect synthetic data, not the ULB dataset.")
        return generate_synthetic(n_rows=24_000, fraud_rate=0.005, seed=args.seed), "synthetic"
    df, result = load_dataset(Path(args.data) if args.data else None)
    dataset = "ulb-creditcard" if not result.downloaded else f"ulb-creditcard (mirror: {result.path.name})"
    return df, dataset


def main(argv: list[str] | None = None) -> int:
    t0 = time.time()
    configure_logging()
    args = parse_args(argv)
    cfg = DEFAULT_MODEL_CONFIG
    set_global_seed(args.seed)

    df, dataset_label = load_frame(args)
    logger.info("Dataset: %s (%d rows)", dataset_label, len(df))

    # ── 1. Quality ─────────────────────────────────────────────────────────
    quality = assess_quality(df)
    if not quality.ok:
        logger.error("Dataset failed quality checks: %s", quality.errors)
        return 1
    write_json_report({"dataset": dataset_label, "quality": quality.to_dict()}, "data_quality")

    # ── 2. EDA (optional, real data only) ──────────────────────────────────
    eda_summary = None
    if not args.skip_eda and not args.fake:
        try:
            eda_summary = run_eda(df)
            write_json_report(eda_summary, "eda_summary")
        except Exception:  # EDA must never block training
            logger.exception("EDA failed; continuing without figures")
    if args.fake:
        logger.info("EDA skipped (synthetic dataset labelled as such)")

    # ── 3. Splits (stratified; test untouched until evaluation) ───────────
    X_raw, y = df.drop(columns=[TARGET]), df[TARGET].to_numpy()
    idx_train, idx_test = next(
        StratifiedShuffleSplit(n_splits=1, test_size=cfg.test_size, random_state=args.seed).split(X_raw, y)
    )
    idx_train, idx_val = next(
        StratifiedShuffleSplit(n_splits=1, test_size=cfg.val_ratio_of_train, random_state=args.seed).split(
            X_raw.iloc[idx_train], y[idx_train]
        )
    )
    train_df, val_df, test_df = df.iloc[idx_train], df.iloc[idx_val], df.iloc[idx_test]
    y_train, y_val, y_test = y[idx_train], y[idx_val], y[idx_test]
    logger.info(
        "Splits (stratified, seed=%d): train=%d val=%d test=%d | fraud rates: %.4f / %.4f / %.4f",
        args.seed, len(train_df), len(val_df), len(test_df),
        y_train.mean(), y_val.mean(), y_test.mean(),
    )
    write_json_report(
        {
            "split": {
                "strategy": "stratified (StratifiedShuffleSplit, 1 repeat)",
                "train_rows": int(len(train_df)),
                "val_rows": int(len(val_df)),
                "test_rows": int(len(test_df)),
                "train_fraud_rate": float(y_train.mean()),
                "val_fraud_rate": float(y_val.mean()),
                "test_fraud_rate": float(y_test.mean()),
                "seed": args.seed,
            }
        },
        "split_report",
    )

    # ── 4. Features + preprocessing (fit on TRAIN only) ────────────────────
    eng_train = engineer_features(train_df)
    preprocessor = FeaturePreprocessor().fit(eng_train)

    X_train = preprocessor.transform(eng_train)
    X_val = preprocessor.transform(engineer_features(val_df))
    X_test = preprocessor.transform(engineer_features(test_df))

    # SHAP background sample (100 stratified rows from train, engineered units)
    bg_idx = np.concatenate([
        np.random.RandomState(args.seed).choice(np.where(y_train == 0)[0], size=80, replace=False),
        np.random.RandomState(args.seed).choice(np.where(y_train == 1)[0], size=20, replace=False),
    ])
    shap_background = X_train[bg_idx]

    # ── 5. Baseline: class-weighted Logistic Regression ───────────────────
    baseline = BaselineModel(cfg).fit(X_train, y_train)
    baseline_proba_test = baseline.predict_proba(X_test)
    baseline_metrics = compute_metrics(y_test, baseline_proba_test, 0.5)

    # ── 6. XGBoost (+ optional randomized search) ─────────────────────────
    xgb = XGBFraudModel(cfg)
    tuned: dict | None = None
    if cfg.tuning["enabled"] and not args.no_tuning:
        logger.info("RandomizedSearchCV: n_iter=%d cv=%d scoring=%s (this is the slow step)",
                    cfg.tuning["n_iter"], cfg.tuning["cv"], cfg.tuning["scoring"])
        search = RandomizedSearchCV(
            xgb.estimator,
            cfg.tuning["param_grid"],
            n_iter=cfg.tuning["n_iter"],
            cv=cfg.tuning["cv"],
            scoring=cfg.tuning["scoring"],
            random_state=args.seed,
            n_jobs=-1,
            refit=True,
            verbose=0,
        )
        search.fit(X_train, y_train)
        xgb.estimator = search.best_estimator_
        tuned = {
            "best_params": {k: (v if not isinstance(v, np.generic) else v.item()) for k, v in search.best_params_.items()},
            "best_score": float(search.best_score_),
            "scoring": cfg.tuning["scoring"],
            "cv": cfg.tuning["cv"],
            "n_iter": cfg.tuning["n_iter"],
        }
        logger.info("Best tuning score (PR-AUC, CV): %.4f — params: %s", search.best_score_, search.best_params_)
    xgb.fit(X_train, y_train)

    xgb_proba_val = xgb.predict_proba(X_val)
    xgb_proba_test = xgb.predict_proba(X_test)

    # ── 7. Threshold optimization (VALIDATION ONLY) ────────────────────────
    # Costs come from the environment; import settings lazily so the CLI
    # stays runnable without a fully configured env (defaults apply).
    from app.core.config import settings  # noqa: PLC0415

    thresholds: Thresholds = select_threshold(
        y_val, xgb_proba_val,
        fp_cost=settings.fp_cost,
        fn_cost=settings.fn_cost,
        strategy=args.strategy,
        recall_target=0.85,
        precision_target=0.5,
    )
    logger.info("Thresholds: max_f1=%.4f min_recall=%.4f min_precision=%.4f business_cost=%.4f → selected=%.4f (%s)",
                thresholds.max_f1, thresholds.min_recall, thresholds.min_precision, thresholds.business_cost,
                thresholds.best_threshold, thresholds.selected_by)

    # ── 8. Final evaluation on the unseen TEST set ─────────────────────────
    test_metrics = compute_metrics(y_test, xgb_proba_test, thresholds.best_threshold)
    baseline_at_threshold = compute_metrics(y_test, baseline_proba_test, thresholds.best_threshold)
    sweep_test = threshold_sweep(y_test, xgb_proba_test, fp_cost=settings.fp_cost, fn_cost=settings.fn_cost)

    tag = args.tag or f"run_{time.strftime('%Y%m%d_%H%M%S')}"
    version = version_now()
    ensure_dirs()

    figure_paths = write_figures(y_test, xgb_proba_test, thresholds.best_threshold, tag)
    write_json_report(
        {
            "version": version,
            "dataset": dataset_label,
            "test_metrics": test_metrics,
            "baseline_metrics": {"logistic_regression_class_weighted": baseline_at_threshold},
            "thresholds": thresholds.as_dict(),
            "tuning": tuned,
            "xgb_config": xgb.config,
            "risk_config": RISK_CONFIG.as_dict(),
            "figures": figure_paths,
            "report_note": (
                "Metrics on the held-out test set with the threshold selected on validation. "
                "These are training-pipeline numbers, not live production metrics."
            ),
        },
        f"training_{version}",
    )
    sweep_test.head(400).to_csv(
        Path(figure_paths["threshold_sweep"]).parent / "threshold_sweep.csv", index=False
    )

    # ── 9. SHAP (global) ───────────────────────────────────────────────────
    shap_global = None
    if not args.no_shap:
        try:
            explainer = build_explainer(xgb.estimator, shap_background)
            X_probe = X_test[: min(1000, len(X_test))]
            shap_global = global_explanation(explainer, X_probe, FEATURE_COLUMNS)
            plot_path = ARTIFACTS_EXPLAINABILITY / f"{version}_summary.png"
            shap_summary_plot(explainer, X_probe, FEATURE_COLUMNS, plot_path)
            shap_global["summary_plot"] = str(plot_path)
            save_global_json(shap_global, ARTIFACTS_EXPLAINABILITY / f"{version}_global.json")
            logger.info("SHAP global explanation computed over %d test rows", len(X_probe))
        except Exception:
            logger.exception("SHAP failed; model is trained but explainability is unavailable for this run")

    # ── 10. Persist the served bundle ──────────────────────────────────────
    vdir = version_dir(version)
    vdir.mkdir(parents=True, exist_ok=True)
    xgb.save(vdir / "model.joblib")
    save_preprocessor(preprocessor.pipeline, shap_background)
    write_json(vdir / "metadata.json", {
        "app": "Credit Card Fraud Detection System",
        "base_model": "xgboost",
        "version": version,
        "dataset": dataset_label,
        "seed": args.seed,
        "training_time_seconds": round(time.time() - t0, 2),
        "feature_columns": FEATURE_COLUMNS,
        "preprocessing": {
            "engineered_features": ["Hour_sin", "Hour_cos", "Amount_log1p"],
            "scalers": {"V1..V28": "StandardScaler", "Amount_log1p": "RobustScaler(1,99)"},
        },
        "xgb_config": xgb.config,
        "tuning": tuned,
        "python": platform.python_version(),
        "generator": (
            "SYNTHETIC DEMO DATA — metrics do NOT describe the real ULB dataset"
            if dataset_label == "synthetic"
            else "ULB/Kaggle creditcard.csv"
        ),
    })
    write_json(vdir / "thresholds.json", thresholds.as_dict())
    write_json(vdir / "risk.json", RISK_CONFIG.as_dict())
    write_json(vdir / "metrics.json", {
        "test": test_metrics,
        "baseline_test": baseline_at_threshold,
        "validation": compute_metrics(y_val, xgb_proba_val, thresholds.best_threshold),
    })
    if shap_global:
        write_json(vdir / "shap_global.json", shap_global)
    save_metrics_copy({"test": test_metrics, "thresholds": thresholds.as_dict(), "dataset": dataset_label}, version)
    set_active_version(version)

    # ── 11. Console summary ────────────────────────────────────────────────
    logger.info("=" * 64)
    logger.info("Training complete in %.1fs — version %s", time.time() - t0, version)
    logger.info("Dataset: %s", dataset_label)
    logger.info("Selected threshold: %.4f (strategy: %s)", thresholds.best_threshold, thresholds.selected_by)
    logger.info(
        "XGBoost test (threshold=%.4f): precision=%.4f recall=%.4f f1=%.4f PR-AUC=%.4f ROC-AUC=%.4f",
        thresholds.best_threshold, test_metrics["precision"], test_metrics["recall"],
        test_metrics["f1"], test_metrics["pr_auc"], test_metrics["roc_auc"],
    )
    logger.info(
        "Baseline LR test (p@0.5): precision=%.4f recall=%.4f f1=%.4f PR-AUC=%.4f ROC-AUC=%.4f",
        baseline_metrics["precision"], baseline_metrics["recall"], baseline_metrics["f1"],
        baseline_metrics["pr_auc"], baseline_metrics["roc_auc"],
    )
    logger.info("Artifacts → artifacts/models/%s (active)", version)
    logger.info("=" * 64)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
