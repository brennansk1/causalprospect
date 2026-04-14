"""Tests for GeoConformal predictor calibration + coverage."""

from __future__ import annotations

import numpy as np
import pytest

from causalprospect.uncertainty.calibration import coverage
from causalprospect.uncertainty.geoconformal import GeoConformalPredictor


class _ConstantModel:
    """Trivial mock predictor returning a fixed positive-class probability."""

    def __init__(self, p: float = 0.5):
        self.p = p

    def predict_proba(self, X):
        n = len(X)
        p = np.full(n, self.p)
        return np.column_stack([1 - p, p])


def _random_coords(n: int, seed: int = 0) -> np.ndarray:
    rng = np.random.default_rng(seed)
    lat = rng.uniform(31.0, 34.5, n)
    lon = rng.uniform(-113.0, -109.0, n)
    return np.column_stack([lat, lon])


def test_calibrate_stores_nonconformity_scores():
    rng = np.random.default_rng(42)
    X_cal = rng.normal(size=(200, 3))
    y_cal = rng.integers(0, 2, size=200)
    coords = _random_coords(200, seed=42)

    gcp = GeoConformalPredictor(_ConstantModel(0.5), alpha=0.1)
    gcp.calibrate(X_cal, y_cal, coords)
    # Every score is |y - 0.5| = 0.5 because model is constant.
    assert gcp._scores is not None
    np.testing.assert_allclose(gcp._scores, 0.5)


def test_coverage_meets_target_on_iid_data():
    """On iid-ish test data the empirical coverage should be ≥ 1-α modulo finite-sample slack."""
    rng = np.random.default_rng(0)
    n_cal, n_test = 500, 500
    y_cal = rng.integers(0, 2, size=n_cal)
    y_test = rng.integers(0, 2, size=n_test)
    X_cal = rng.normal(size=(n_cal, 2))
    X_test = rng.normal(size=(n_test, 2))
    coords_cal = _random_coords(n_cal, seed=1)
    coords_test = _random_coords(n_test, seed=2)

    gcp = GeoConformalPredictor(_ConstantModel(0.5), alpha=0.1)
    gcp.calibrate(X_cal, y_cal, coords_cal)
    r = gcp.predict(X_test, coords_test)
    cov = coverage(y_test, r.lower, r.upper)
    # 1-α target is 0.9; allow 5 pts finite-sample slack.
    assert cov >= 0.85


def test_interval_bounds_stay_in_unit_range():
    rng = np.random.default_rng(7)
    X = rng.normal(size=(50, 2))
    y = rng.integers(0, 2, size=50)
    coords = _random_coords(50, seed=3)

    gcp = GeoConformalPredictor(_ConstantModel(0.7), alpha=0.2)
    gcp.calibrate(X, y, coords)
    r = gcp.predict(X[:10], coords[:10])
    assert (r.lower >= 0).all()
    assert (r.upper <= 1).all()
    assert (r.upper >= r.lower).all()


def test_predict_before_calibrate_raises():
    gcp = GeoConformalPredictor(_ConstantModel())
    with pytest.raises(RuntimeError):
        gcp.predict([[0.0, 0.0]], np.array([[32.0, -111.0]]))
