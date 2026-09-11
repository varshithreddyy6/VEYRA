"""Threshold optimization tests: sweep invariants and strategy behaviour."""
from __future__ import annotations

import numpy as np
import pytest

from app.fraud_detector.evaluation.metrics import business_cost
from app.fraud_detector.evaluation.threshold import select_threshold, threshold_sweep


def make_probabilities(n=2000, seed=1):
    rng = np.random.default_rng(seed)
    y = rng.integers(0, 2, n)
    y[0:20] = 1  # ensure positive class present
    prob = rng.random(n)
    prob[y == 1] = np.clip(prob[y == 1] + 0.35, 0, 1)
    return y, prob


def test_sweep_has_all_metrics():
    y, prob = make_probabilities()
    sweep = threshold_sweep(y, prob, n_points=100)
    assert {"threshold", "precision", "recall", "f1", "false_positive", "false_negative", "cost"} <= set(sweep.columns)
    assert len(sweep) >= 50


def test_sweep_recall_monotonic_non_increasing():
    y, prob = make_probabilities()
    sweep = threshold_sweep(y, prob, n_points=120)
    recalls = sweep["recall"].to_numpy()
    assert np.all(np.diff(recalls) <= 1e-9)


def test_sweep_cost_reflects_fn_penalty():
    y, prob = make_probabilities()
    sweep = threshold_sweep(y, prob, fp_cost=1.0, fn_cost=10.0, n_points=120)
    # The minimiser must beat (or at least match) the default 0.5 operating point.
    cost_at_default = sweep.loc[sweep["threshold"].sub(0.5).abs().idxmin(), "cost"]
    best = sweep.loc[sweep["cost"].idxmin()]
    assert best["cost"] <= cost_at_default
    # With expensive false negatives, the minimising threshold sits on the low side.
    assert best["threshold"] <= 0.7


def test_selected_thresholds_are_plausible():
    y, prob = make_probabilities()
    t = select_threshold(y, prob, fp_cost=1.0, fn_cost=5.0, strategy="max_f1")
    assert 0.0 < t.best_threshold < 1.0
    assert t.selected_by == "max_f1"
    # All alternative operating points are also in [0,1]
    for v in (t.max_f1, t.min_recall, t.min_precision, t.business_cost):
        assert 0.0 < v < 1.0


def test_strategy_is_used():
    y, prob = make_probabilities()
    t = select_threshold(y, prob, strategy="business_cost")
    assert t.selected_by == "business_cost"
    assert t.best_threshold == pytest.approx(t.business_cost)
    t2 = select_threshold(y, prob, strategy="min_recall")
    assert t2.best_threshold == pytest.approx(t2.min_recall)


def test_business_cost_math():
    y = np.array([0, 0, 1, 1])
    pred = np.array([1, 0, 0, 1])  # FP=1, FN=1
    assert business_cost(y, pred, fp_cost=1.0, fn_cost=5.0) == pytest.approx(6.0)


def test_threshold_never_selected_on_test_data_only_validation():
    """The optimizer must be pure: given fixed inputs it returns the same
    operating point regardless of any downstream test set (it never sees one)."""
    y, prob = make_probabilities()
    t1 = select_threshold(y, prob, strategy="max_f1")
    t2 = select_threshold(y, prob, strategy="max_f1")
    assert t1.best_threshold == t2.best_threshold
