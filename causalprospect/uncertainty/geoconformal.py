"""GeoConformal prediction (Lou et al., 2024, *Annals of the AAG*).

Distribution-free prediction intervals with geographic kernel weighting so
interval width adapts to local calibration density and geological complexity,
rather than just data configuration (as kriging variance does).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


def _haversine(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Pairwise haversine distance on (lat, lon) in degrees — returns radians."""
    a = np.radians(a)
    b = np.radians(b)
    lat1 = a[:, 0:1]
    lon1 = a[:, 1:2]
    lat2 = b[:, 0:1].T
    lon2 = b[:, 1:2].T
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * np.arcsin(np.sqrt(np.clip(h, 0.0, 1.0)))


@dataclass
class GeoConformalPrediction:
    predictions: np.ndarray
    lower: np.ndarray
    upper: np.ndarray
    widths: np.ndarray


class GeoConformalPredictor:
    """Model-agnostic geographically-weighted conformal intervals."""

    def __init__(self, model, *, alpha: float = 0.1, bandwidth: str | float = "adaptive"):
        self.model = model
        self.alpha = alpha
        self.bandwidth = bandwidth
        self._scores: np.ndarray | None = None
        self._coords: np.ndarray | None = None
        self._h: float | None = None

    def calibrate(self, X_cal, y_cal, coords_cal: np.ndarray) -> None:
        y_pred = self._predict_proba(X_cal)
        self._scores = np.abs(np.asarray(y_cal, dtype=float) - y_pred)
        self._coords = np.asarray(coords_cal, dtype=float)
        if self.bandwidth == "adaptive":
            from sklearn.neighbors import NearestNeighbors

            k = max(5, int(np.sqrt(len(self._coords))))
            nn = NearestNeighbors(n_neighbors=k, metric="haversine")
            nn.fit(np.radians(self._coords))
            d, _ = nn.kneighbors(np.radians(self._coords))
            self._h = float(np.median(d[:, -1]))
        else:
            self._h = float(self.bandwidth)

    def predict(self, X_test, coords_test: np.ndarray) -> GeoConformalPrediction:
        if self._scores is None:
            raise RuntimeError("Call calibrate() before predict().")
        coords_test = np.asarray(coords_test, dtype=float)
        preds = self._predict_proba(X_test)

        d = _haversine(coords_test, self._coords)
        w = np.exp(-0.5 * (d / self._h) ** 2)
        w /= w.sum(axis=1, keepdims=True)

        order = np.argsort(self._scores)
        sorted_scores = self._scores[order]
        # Weighted quantile per test point.
        margins = np.empty(len(preds))
        for i in range(len(preds)):
            cw = np.cumsum(w[i, order])
            idx = min(np.searchsorted(cw, 1 - self.alpha), len(sorted_scores) - 1)
            margins[i] = sorted_scores[idx]

        lower = np.clip(preds - margins, 0.0, 1.0)
        upper = np.clip(preds + margins, 0.0, 1.0)
        return GeoConformalPrediction(preds, lower, upper, upper - lower)

    def _predict_proba(self, X) -> np.ndarray:
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(X)[:, 1]
        return np.asarray(self.model.predict(X)).ravel()
