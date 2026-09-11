"""Deterministic fraud-screening rule engine.

Rules are transparent, documentable screening signals that run BEFORE/AFTER
the model to augment (never replace) the ML probability:

    amount_anomaly       — amount above the configured high-amount bound
    night_high_amount    — amount above the night bound during night hours
    velocity             — too many screenings from the same external ref
                           within the velocity window
    short_time_high      — large amount very soon after the previous
                           transaction of the same reference
    missing_fields       — request omitted reference/label metadata

Rule flags are recorded separately from the model output; the prediction
itself always comes from the model + threshold.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.fraud_detector.config import DEFAULT_RULE_CONFIG, RuleConfig


class RuleEngine:
    def __init__(self, config: RuleConfig | None = None) -> None:
        self.config = config or DEFAULT_RULE_CONFIG

    # ── Single-transaction rules ───────────────────────────────────────────
    def evaluate_transaction(self, amount: float, occurred_at: datetime,
                             external_ref: str | None = None, previous: Iterable[datetime] | None = None) -> list[dict]:
        """Returns a list of {rule, human_readable} dicts for this transaction."""
        flags: list[dict] = []

        if amount >= self.config.high_amount_usd:
            flags.append({
                "rule": "amount_anomaly",
                "human_readable": (
                    f"Amount ${amount:,.2f} is at or above the high-amount bound "
                    f"(${self.config.high_amount_usd:,.2f})."
                ),
            })

        hour = occurred_at.astimezone(timezone.utc).hour
        if self.config.night_start_hour <= hour or hour < self.config.night_end_hour:
            if amount >= self.config.night_high_amount_usd:
                flags.append({
                    "rule": "night_high_amount",
                    "human_readable": (
                        f"Amount ${amount:,.2f} occurred during night hours "
                        f"({hour:02d}:00 UTC) and exceeds the night bound "
                        f"(${self.config.night_high_amount_usd:,.2f})."
                    ),
                })

        if previous:
            window = timedelta(hours=self.config.velocity_window_hours)
            # SQLite returns naive datetimes for TIMESTAMP columns; treat them
            # as UTC so the arithmetic is safe on every dialect.
            def _aware(t: datetime) -> datetime:
                return t if t.tzinfo is not None else t.replace(tzinfo=timezone.utc)

            recent = [t for t in previous if occurred_at - _aware(t) <= window and _aware(t) <= occurred_at]
            if len(recent) >= self.config.velocity_max_attempts:
                flags.append({
                    "rule": "velocity",
                    "human_readable": (
                        f"{len(recent) + 1} transactions from reference "
                        f"'{external_ref or 'unknown'}' within {self.config.velocity_window_hours:.0f}h."
                    ),
                })
            recent_sorted = sorted(_aware(t) for t in recent)
            if recent_sorted:
                gap = occurred_at - recent_sorted[-1]
                if gap <= timedelta(hours=self.config.time_horizon_hours) and amount >= self.config.time_high_amount_usd:
                    flags.append({
                        "rule": "short_time_high_amount",
                        "human_readable": (
                            f"Amount ${amount:,.2f} occurred {gap.total_seconds() / 3600:.1f}h after the "
                            f"last event from the same reference (bound: {self.config.time_horizon_hours:.0f}h "
                            f"and ${self.config.time_high_amount_usd:,.2f})."
                        ),
                    })

        if not external_ref:
            flags.append({
                "rule": "missing_fields",
                "human_readable": "No external reference supplied; velocity rules have reduced context.",
            })

        return flags

    # ── Batch rules (no history available: amount + time only) ─────────────
    def evaluate_row(self, amount: float, occurred_at: datetime) -> list[str]:
        return [f["rule"] for f in self.evaluate_transaction(amount, occurred_at)]
