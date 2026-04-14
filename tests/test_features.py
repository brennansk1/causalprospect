"""Tests for feature engineering and spatial joins."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import Point

from causalprospect.data.features import engineer_features, join_deposits


def _grid_df(n: int = 10) -> pd.DataFrame:
    """Synthetic H3-style grid in the AZ bbox."""
    rng = np.random.default_rng(0)
    return pd.DataFrame(
        {
            "cell": [f"c{i}" for i in range(n)],
            "lat": rng.uniform(31.5, 34.0, n),
            "lon": rng.uniform(-112.5, -109.5, n),
            "resolution": 7,
        }
    )


def test_engineer_features_adds_ratios_when_inputs_present():
    g = _grid_df()
    g["radiometric_K"] = np.linspace(1, 5, len(g))
    g["radiometric_Th"] = np.linspace(1, 5, len(g))
    g["radiometric_U"] = np.linspace(1, 5, len(g))

    out = engineer_features(g)
    assert "k_th_ratio" in out.columns
    assert "k_u_ratio" in out.columns
    assert "th_u_ratio" in out.columns
    assert "k_metasomatism_index" in out.columns


def test_engineer_features_leaves_input_unchanged():
    g = _grid_df()
    g["Cu_ppm"] = np.array([1.0, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    original = g.copy()

    _ = engineer_features(g)
    pd.testing.assert_frame_equal(g, original)


def test_engineer_features_log_transforms_handle_zeros():
    g = _grid_df()
    g["Cu_ppm"] = np.zeros(len(g))  # log1p(0) = 0, not -inf

    out = engineer_features(g)
    assert "log_Cu_ppm" in out.columns
    assert np.all(np.isfinite(out["log_Cu_ppm"]))


def test_join_deposits_cu_filter_excludes_other_commodities():
    grid = _grid_df()
    # Two deposits: one Cu Producer (should flag nearby grid cell) and one
    # Au Prospect (should be filtered out).
    deposits = gpd.GeoDataFrame(
        {
            "site_name": ["Cu Mine", "Au Mine"],
            "dev_stat": ["Producer", "Prospect"],
            "code_list": ["CU", "AU"],
            "geometry": [
                Point(grid["lon"].iloc[0], grid["lat"].iloc[0]),
                Point(grid["lon"].iloc[1], grid["lat"].iloc[1]),
            ],
        },
        crs="EPSG:4326",
    )
    out = join_deposits(grid, deposits, buffer_km=1.0)
    # The Cu deposit should flag exactly the cell it sits on; the Au prospect
    # should be filtered out entirely.
    assert out.loc[0, "deposit_present"] == 1
    # Cell index 1 was the Au location — should NOT be flagged.
    assert out.loc[1, "deposit_present"] == 0


def test_join_deposits_empty_gdf_returns_zero_column():
    grid = _grid_df()
    empty = gpd.GeoDataFrame(columns=["geometry"], geometry="geometry", crs="EPSG:4326")
    out = join_deposits(grid, empty)
    assert (out["deposit_present"] == 0).all()


@pytest.mark.parametrize("n", [5, 50, 500])
def test_grid_shape_preserved_through_engineering(n):
    g = _grid_df(n)
    out = engineer_features(g)
    assert len(out) == n
