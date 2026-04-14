"""Prospectivity-specific evaluation metrics."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import average_precision_score, roc_auc_score


def auc_roc(y_true, y_score) -> float:
    return float(roc_auc_score(y_true, y_score))


def auc_pr(y_true, y_score) -> float:
    return float(average_precision_score(y_true, y_score))


def success_rate_curve(y_true: np.ndarray, y_score: np.ndarray) -> dict[str, list[float]]:
    """% of deposits captured vs. % of study area examined.

    Returns a curve that can be plotted directly in the dashboard.
    """
    y_true = np.asarray(y_true, dtype=int)
    y_score = np.asarray(y_score, dtype=float)
    order = np.argsort(-y_score)
    y_sorted = y_true[order]
    cum_pos = np.cumsum(y_sorted) / max(1, y_sorted.sum())
    area_pct = np.arange(1, len(y_sorted) + 1) / len(y_sorted)
    return {
        "area_examined": [float(x) for x in area_pct],
        "deposits_found": [float(x) for x in cum_pos],
    }
