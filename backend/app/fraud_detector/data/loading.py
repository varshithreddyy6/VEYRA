"""Load the ULB/Kaggle credit card dataset.

The raw file is expected at ``data/raw/creditcard.csv`` (see data/README.md).
If it is missing, the loader tries one public mirror of the same dataset and
otherwise raises a clear, actionable error. No absolute paths are hard-coded.
"""
from __future__ import annotations

import logging
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from app.fraud_detector.config import DATA_ROOT, RAW_COLUMNS

logger = logging.getLogger("fraud.data.loading")

# Public mirror of the ULB dataset (same CSV, same columns). Used only when
# the local file is absent — Kaggle's own downloader requires credentials.
MIRROR_URL = "https://media.githubusercontent.com/media/aruns2/creditcard-fraud-detection/master/data/creditcard.csv"


@dataclass
class LoadResult:
    path: Path
    source: str  # "local" | "mirror"
    downloaded: bool


def locate_dataset(data_dir: Path, filename: str = "creditcard.csv") -> tuple[Path, bool]:
    """Return (path, downloaded). Raises FileNotFoundError with instructions."""
    raw_dir = data_dir / "raw"
    path = raw_dir / filename

    if path.exists():
        return path, False

    raw_dir.mkdir(parents=True, exist_ok=True)
    logger.warning("Dataset not found at %s — attempting public mirror download", path)
    try:
        urllib.request.urlretrieve(MIRROR_URL, path)  # noqa: S310 (documented public source)
        size_mb = path.stat().st_size / 1024 / 1024
        if size_mb < 10:  # sanity check: real file is ~143 MB
            path.unlink(missing_ok=True)
            raise FileNotFoundError("Downloaded file looks truncated")
        logger.info("Downloaded dataset from mirror (%.1f MB)", size_mb)
        return path, True
    except Exception as exc:  # network errors of any kind
        raise FileNotFoundError(
            f"Dataset not found at {path} and the public mirror download failed "
            f"({exc}). Please download creditcard.csv from "
            "https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud and place it "
            "at data/raw/creditcard.csv — see data/README.md."
        ) from exc


def load_dataset(path: Path | str | None = None) -> tuple[pd.DataFrame, LoadResult]:
    """Load the CSV with strict dtype expectations. Returns (df, result)."""
    if path is None:
        resolved, downloaded = locate_dataset(DATA_ROOT)
    else:
        resolved, downloaded = Path(path), False

    df = pd.read_csv(resolved, encoding="utf-8")

    missing = [c for c in RAW_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}. Found: {list(df.columns)}")

    df = df[RAW_COLUMNS]
    logger.info("Loaded %s (%d rows x %d cols)", resolved, len(df), df.shape[1])
    return df, LoadResult(path=resolved, source="mirror" if downloaded else "local", downloaded=downloaded)
