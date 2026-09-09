"""Reproducibility helpers: every random component seeds through here."""
from __future__ import annotations

import os
import random

import numpy as np

DEFAULT_SEED = 42


def set_global_seed(seed: int = DEFAULT_SEED) -> None:
    """Seed Python, NumPy and (if present) XGBoost for reproducible runs."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    np.random.seed(seed)
    try:
        from xgboost import set_config  # type: ignore

        set_config(verbosity=0)
    except ImportError:  # pragma: no cover
        pass
    try:  # torch is not a dependency; guard in case it appears later
        import torch  # type: ignore

        torch.manual_seed(seed)
    except ImportError:
        pass


def make_seed(seed: int = DEFAULT_SEED) -> int:
    """Stable per-role seeds derived from the base seed."""
    return int(seed)
