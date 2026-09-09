"""SYNTHETIC dataset generator — for pipeline demos and tests ONLY.

Why this exists: the real ULB dataset must be downloaded by the user
(see data/README.md). To let CI and quick local runs exercise the full
pipeline (preprocessing → training → threshold optimization → SHAP)
without it, this generator produces a *clearly labelled* simulated
dataset with the same columns and a similar imbalance profile.

It is NOT the real dataset. Metrics produced from it are synthetic-data
metrics, and both the training report and model metadata record
`dataset: synthetic` so nothing is ever mistaken for real performance.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from app.fraud_detector.config import PRINCIPAL_FEATURES, TARGET
from app.fraud_detector.utils.seeds import set_global_seed

# A handful of latent "fraud drivers" shared by synthetic fraud rows.
# (Mirrors the real dataset's structure, not its values.)
_DRIVERS = {
    "V14": (-2.6, 1.6),
    "V17": (-2.2, 1.5),
    "V12": (-1.9, 1.4),
    "V10": (-1.4, 1.2),
    "V3": (-1.1, 1.2),
    "V16": (-1.0, 1.0),
}


def generate_synthetic(
    n_rows: int = 24_000,
    fraud_rate: float = 0.005,
    seed: int = 42,
) -> pd.DataFrame:
    set_global_seed(seed)
    rng = np.random.default_rng(seed)

    n_fraud = int(n_rows * fraud_rate)
    n_legit = n_rows - n_fraud

    def _make_block(n: int, is_fraud: bool) -> pd.DataFrame:
        block = pd.DataFrame()
        block["Time"] = rng.uniform(0, 2 * 86400, n)
        for i in range(1, 29):
            block[f"V{i}"] = rng.normal(0, 1, n)
        base_amount = rng.lognormal(mean=3.6, sigma=1.4, size=n)  # ~ USD 0–3000, heavy tail
        if is_fraud:
            # Fraud: shifts on the driver features + larger/skewed amounts, night-heavy
            drivers = list(_DRIVERS.keys())
            for driver in drivers:
                shift, spread = _DRIVERS[driver]
                block[driver] = block[driver] + rng.normal(shift, spread * 0.35, n)
            night = rng.random(n) < 0.45
            boost = np.where(night, 1.9, 1.3)
            block["Amount"] = np.clip(base_amount * boost, 1.0, 25_000.0)
        else:
            block["Amount"] = np.clip(base_amount, 0.0, 25_000.0)
        return block

    frame = pd.concat([_make_block(n_legit, False), _make_block(n_fraud, True)], ignore_index=True)
    frame[TARGET] = 0
    frame.loc[n_legit:, TARGET] = 1
    frame = frame.sample(frac=1, random_state=seed).reset_index(drop=True)
    return frame[[*PRINCIPAL_FEATURES + ["Time", "Amount"], TARGET]]
