"""Spatial Granger Causality (Zhu et al., 2025, *Gondwana Research*).

Tests whether the spatial distribution of X improves prediction of Y beyond
Y's own spatial lag. Returns F-statistic + p-value per ordered pair.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy import stats


@dataclass
class SGCResult:
    source: str
    target: str
    f_stat: float
    p_value: float
    significant: bool


def spatial_lag(W: np.ndarray, x: np.ndarray) -> np.ndarray:
    return W @ x


def sgc_test(
    y: np.ndarray,
    x: np.ndarray,
    W: np.ndarray,
    *,
    alpha: float = 0.05,
) -> tuple[float, float]:
    """Test H0: x does NOT spatially Granger-cause y.

    Restricted model:   y = a0 + a1 Wy + eps_r
    Unrestricted model: y = b0 + b1 Wy + b2 Wx + eps_u
    F-test on the additional explanatory power of Wx.
    """
    n = len(y)
    Wy = spatial_lag(W, y)
    Wx = spatial_lag(W, x)

    # Restricted
    Xr = np.column_stack([np.ones(n), Wy])
    br, *_ = np.linalg.lstsq(Xr, y, rcond=None)
    rss_r = float(np.sum((y - Xr @ br) ** 2))

    # Unrestricted
    Xu = np.column_stack([np.ones(n), Wy, Wx])
    bu, *_ = np.linalg.lstsq(Xu, y, rcond=None)
    rss_u = float(np.sum((y - Xu @ bu) ** 2))

    df_num = 1
    df_den = n - Xu.shape[1]
    f = ((rss_r - rss_u) / df_num) / (rss_u / df_den)
    p = 1 - stats.f.cdf(f, df_num, df_den)
    return float(f), float(p)


def pairwise_sgc(
    data: np.ndarray,
    feature_names: list[str],
    W: np.ndarray,
    *,
    alpha: float = 0.05,
) -> list[SGCResult]:
    out: list[SGCResult] = []
    n_features = data.shape[1]
    for i in range(n_features):
        for j in range(n_features):
            if i == j:
                continue
            f, p = sgc_test(data[:, j], data[:, i], W)
            out.append(
                SGCResult(
                    source=feature_names[i],
                    target=feature_names[j],
                    f_stat=f,
                    p_value=p,
                    significant=p < alpha,
                )
            )
    return out
