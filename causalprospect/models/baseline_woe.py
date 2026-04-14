"""Weights of Evidence — industry-standard baseline."""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd


@dataclass
class WoEModel:
    """Bayesian log-linear baseline. One binary evidence layer per feature."""

    weights_pos: dict[str, float] = field(default_factory=dict)
    weights_neg: dict[str, float] = field(default_factory=dict)
    prior_log_odds: float = 0.0

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "WoEModel":
        y = np.asarray(y, dtype=int)
        n_pos = int(y.sum())
        n_neg = len(y) - n_pos
        self.prior_log_odds = np.log((n_pos + 0.5) / (n_neg + 0.5))
        for col in X.columns:
            ev = (X[col].values > 0).astype(int)
            a = int(((ev == 1) & (y == 1)).sum()) + 0.5
            b = int(((ev == 0) & (y == 1)).sum()) + 0.5
            c = int(((ev == 1) & (y == 0)).sum()) + 0.5
            d = int(((ev == 0) & (y == 0)).sum()) + 0.5
            self.weights_pos[col] = float(np.log(a / c) - np.log(b / d))
            self.weights_neg[col] = float(np.log(b / d) - np.log(a / c))
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        log_odds = np.full(len(X), self.prior_log_odds)
        for col in X.columns:
            ev = (X[col].values > 0).astype(int)
            w = np.where(ev == 1, self.weights_pos[col], self.weights_neg[col])
            log_odds = log_odds + w
        p = 1.0 / (1.0 + np.exp(-log_odds))
        return np.column_stack([1 - p, p])
