"""Spatial block cross-validation to prevent leakage from spatial autocorrelation."""

from __future__ import annotations

import numpy as np


def spatial_block_split(
    coords: np.ndarray,
    *,
    n_blocks: int = 10,
    train_frac: float = 0.6,
    cal_frac: float = 0.2,
    seed: int = 42,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Partition points into contiguous spatial blocks, then assign whole
    blocks to train / calibration / test sets. This prevents nearby cells
    ending up in both train and test, which would over-estimate performance.
    """
    rng = np.random.default_rng(seed)
    lats, lons = coords[:, 0], coords[:, 1]
    lat_bins = np.linspace(lats.min(), lats.max() + 1e-9, int(np.sqrt(n_blocks)) + 1)
    lon_bins = np.linspace(lons.min(), lons.max() + 1e-9, int(np.sqrt(n_blocks)) + 1)
    lat_idx = np.digitize(lats, lat_bins) - 1
    lon_idx = np.digitize(lons, lon_bins) - 1
    block_id = lat_idx * (len(lon_bins)) + lon_idx

    unique_blocks = np.unique(block_id)
    rng.shuffle(unique_blocks)
    n = len(unique_blocks)
    n_train = int(round(train_frac * n))
    n_cal = int(round(cal_frac * n))
    train_blocks = set(unique_blocks[:n_train])
    cal_blocks = set(unique_blocks[n_train : n_train + n_cal])

    train_mask = np.array([b in train_blocks for b in block_id])
    cal_mask = np.array([b in cal_blocks for b in block_id])
    test_mask = ~(train_mask | cal_mask)
    return train_mask, cal_mask, test_mask
