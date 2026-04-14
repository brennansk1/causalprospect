"""Calibration diagnostics for prediction intervals."""

from __future__ import annotations

import numpy as np


def coverage(y_true: np.ndarray, lower: np.ndarray, upper: np.ndarray) -> float:
    y_true = np.asarray(y_true)
    return float(np.mean((y_true >= lower) & (y_true <= upper)))


def coverage_curve(
    y_true: np.ndarray,
    predictor,
    X_test,
    coords_test,
    alphas: np.ndarray | None = None,
) -> dict[str, list[float]]:
    if alphas is None:
        alphas = np.linspace(0.02, 0.4, 20)
    targets = []
    actual = []
    for a in alphas:
        predictor.alpha = float(a)
        r = predictor.predict(X_test, coords_test)
        targets.append(1 - float(a))
        actual.append(coverage(y_true, r.lower, r.upper))
    return {"target": targets, "actual": actual}


def interval_width_vs_difficulty(
    widths: np.ndarray,
    difficulty: np.ndarray,
) -> float:
    """Spearman rank correlation between width and a difficulty proxy
    (fault density, lithological heterogeneity, etc.). Higher is better —
    it means the UQ is tracking real geological complexity."""
    from scipy.stats import spearmanr

    r, _ = spearmanr(widths, difficulty)
    return float(r)
