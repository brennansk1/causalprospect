"""Feature engineering: spatial joins from raw layers onto the H3 grid."""

from __future__ import annotations

import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import Point


def _points_from_grid(grid: pd.DataFrame) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(
        grid.copy(),
        geometry=[Point(lo, la) for la, lo in zip(grid["lat"], grid["lon"])],
        crs="EPSG:4326",
    )


def join_deposits(
    grid: pd.DataFrame,
    deposits: gpd.GeoDataFrame,
    *,
    buffer_km: float = 2.0,
    commodity_filter: str | None = "CU",
    status_filter: tuple[str, ...] | None = ("Producer", "Past Producer"),
) -> pd.DataFrame:
    """Flag grid cells near a major known deposit of the target commodity.

    Default filters to Cu-commodity producers only (porphyry copper target).
    Passing `commodity_filter=None, status_filter=None` reverts to the
    unfiltered "any MRDS occurrence" behavior.
    """
    if deposits.empty:
        grid["deposit_present"] = 0
        return grid

    target = deposits
    if commodity_filter and "code_list" in target.columns:
        target = target[target["code_list"].fillna("").str.contains(commodity_filter, na=False)]
    if status_filter and "dev_stat" in target.columns:
        target = target[target["dev_stat"].isin(status_filter)]
    if target.empty:
        # Fall back to unfiltered deposits if the filter rejected everything.
        target = deposits

    pts = _points_from_grid(grid).to_crs("EPSG:3857")
    dep = target.to_crs("EPSG:3857")
    joined = gpd.sjoin_nearest(pts, dep, how="left", distance_col="_d")
    flag = (joined["_d"] <= buffer_km * 1000).astype(int)
    grid = grid.copy()
    grid["deposit_present"] = flag.groupby(level=0).max().reindex(grid.index, fill_value=0).values
    return grid


def join_geochemistry(
    grid: pd.DataFrame,
    geochem: gpd.GeoDataFrame,
    *,
    elements: tuple[str, ...] = ("Cu_ppm", "Mo_ppm", "Au_ppb", "As_ppm", "Zn_ppm", "Pb_ppm"),
    k: int = 8,
) -> pd.DataFrame:
    """Inverse-distance-weighted interpolation of geochemistry onto grid cells."""
    from sklearn.neighbors import BallTree

    if geochem.empty:
        for el in elements:
            grid[el] = np.nan
        return grid
    pts = np.deg2rad(geochem.geometry.apply(lambda g: (g.y, g.x)).tolist())
    tree = BallTree(pts, metric="haversine")
    grid_pts = np.deg2rad(grid[["lat", "lon"]].values)
    d, idx = tree.query(grid_pts, k=min(k, len(pts)))
    w = 1.0 / np.maximum(d, 1e-6)
    w /= w.sum(axis=1, keepdims=True)
    grid = grid.copy()
    for el in elements:
        if el in geochem.columns:
            vals = pd.to_numeric(geochem[el], errors="coerce").values
            grid[el] = (w * vals[idx]).sum(axis=1)
        else:
            grid[el] = np.nan
    return grid


def join_raster_zonal(
    grid: pd.DataFrame,
    raster_path: str,
    col_name: str,
) -> pd.DataFrame:
    """Sample raster at each cell centroid, reprojecting coords into the
    raster's CRS when necessary (Earth MRI TIFs are typically UTM)."""
    import rasterio
    from pyproj import Transformer

    grid = grid.copy()
    with rasterio.open(raster_path) as src:
        if src.crs and src.crs.to_epsg() != 4326:
            tf = Transformer.from_crs("EPSG:4326", src.crs, always_xy=True)
            xs, ys = tf.transform(grid["lon"].values, grid["lat"].values)
            pts = list(zip(xs, ys))
        else:
            pts = [(lo, la) for la, lo in zip(grid["lat"], grid["lon"])]
        nodata = src.nodata
        vals = []
        for v in src.sample(pts):
            if v is None or (nodata is not None and v[0] == nodata):
                vals.append(np.nan)
            else:
                vals.append(float(v[0]))
    grid[col_name] = vals
    return grid


def compute_structural(grid: pd.DataFrame, faults: gpd.GeoDataFrame) -> pd.DataFrame:
    """Distance to nearest fault + fault density in each cell's neighborhood."""
    from shapely.ops import unary_union

    grid = grid.copy()
    if faults.empty:
        grid["distance_to_fault_m"] = np.nan
        grid["fault_density"] = 0.0
        return grid
    pts = _points_from_grid(grid).to_crs("EPSG:3857")
    f = faults.to_crs("EPSG:3857")
    union = unary_union(f.geometry.values)
    grid["distance_to_fault_m"] = pts.geometry.distance(union).values
    grid["fault_density"] = (grid["distance_to_fault_m"] < 5000).astype(float)
    return grid


def engineer_features(grid: pd.DataFrame) -> pd.DataFrame:
    """Derived features: ratios, residuals, log transforms, alteration proxies.

    Each engineered feature has a published geological interpretation:
    - K/Th, K/U track K-metasomatism — the classic porphyry alteration signature
    - Th/U tracks U mobility — distinguishes unaltered from leached rocks
    - Magnetic residual (RTP − TMI) isolates structural contribution from remanent
    - log-transforms make the heavy-tailed geochem / geophysics distributions
      more linearly separable for PC-algorithm conditional independence tests
    """
    g = grid.copy()

    # Geochem logs.
    for col in ("Cu_ppm", "Mo_ppm", "Au_ppb", "As_ppm", "Zn_ppm", "Pb_ppm"):
        if col in g.columns:
            g[f"log_{col}"] = np.log1p(g[col].clip(lower=0))

    # Radiometric ratios.
    if {"radiometric_K", "radiometric_Th"}.issubset(g.columns):
        g["k_th_ratio"] = g["radiometric_K"] / g["radiometric_Th"].replace(0, np.nan)
    if {"radiometric_K", "radiometric_U"}.issubset(g.columns):
        g["k_u_ratio"] = g["radiometric_K"] / g["radiometric_U"].replace(0, np.nan)
    if {"radiometric_Th", "radiometric_U"}.issubset(g.columns):
        g["th_u_ratio"] = g["radiometric_Th"] / g["radiometric_U"].replace(0, np.nan)

    # Magnetic residual (reduced-to-pole minus total magnetic intensity) —
    # highlights the contribution of structural vs. remanent magnetization.
    if {"magnetic_rtp", "magnetic_anomaly_TMI"}.issubset(g.columns):
        g["magnetic_residual"] = g["magnetic_rtp"] - g["magnetic_anomaly_TMI"]

    # Magnetic log transforms (airborne TMI spans 4+ orders of magnitude).
    for col in ("magnetic_anomaly_TMI", "magnetic_rtp"):
        if col in g.columns:
            v = g[col]
            offset = abs(v.min(skipna=True)) + 1 if v.min(skipna=True) < 0 else 0
            g[f"log_{col}"] = np.log1p(v + offset)

    # Structural interactions — these capture the porphyry "sweet spot" of
    # intrusive host rock located near a major fault zone.
    if {"lith_intrusive", "fault_density"}.issubset(g.columns):
        g["intrusive_x_fault"] = g["lith_intrusive"] * g["fault_density"]
    if {"lith_intrusive", "distance_to_fault_m"}.issubset(g.columns):
        g["intrusive_near_fault"] = g["lith_intrusive"] / (1 + g["distance_to_fault_m"] / 1000)

    # Alteration proxies: high K but low Th/U relative to background suggests
    # hydrothermal potassium enrichment.
    if {"radiometric_K", "radiometric_Th", "radiometric_U"}.issubset(g.columns):
        baseline_th = g["radiometric_Th"].median(skipna=True)
        baseline_u = g["radiometric_U"].median(skipna=True)
        g["k_metasomatism_index"] = g["radiometric_K"] / (
            (g["radiometric_Th"] / baseline_th) + (g["radiometric_U"] / baseline_u) + 1e-6
        )

    return g


def join_macrostrat(grid: pd.DataFrame, mstrat: pd.DataFrame, *, k: int = 4) -> pd.DataFrame:
    """IDW-interpolate lithological age and a derived lithology-type index."""
    from sklearn.neighbors import BallTree

    g = grid.copy()
    if mstrat.empty:
        g["geological_age_ma"] = np.nan
        g["lith_intrusive"] = 0.0
        return g
    pts = np.deg2rad(mstrat[["lat", "lon"]].values)
    tree = BallTree(pts, metric="haversine")
    gp = np.deg2rad(g[["lat", "lon"]].values)
    d, idx = tree.query(gp, k=min(k, len(pts)))
    w = 1.0 / np.maximum(d, 1e-6)
    w /= w.sum(axis=1, keepdims=True)
    ages = pd.to_numeric(mstrat["age_top"], errors="coerce").fillna(
        pd.to_numeric(mstrat["age_bottom"], errors="coerce")
    ).fillna(0).values
    g["geological_age_ma"] = (w * ages[idx]).sum(axis=1)

    intrusive_kw = ("granit", "diorite", "intrus", "porphyr", "monzonit", "granodiorit")
    liths = mstrat["lith"].fillna("").str.lower().values
    is_intrusive = np.array([any(k in l for k in intrusive_kw) for l in liths], dtype=float)
    g["lith_intrusive"] = (w * is_intrusive[idx]).sum(axis=1)
    return g


def join_azgs_density(grid: pd.DataFrame, azgs_gdf, *, radius_km: float = 5.0) -> pd.DataFrame:
    """Count distinct formations within `radius_km` of each cell centroid."""
    import geopandas as gpd
    from sklearn.neighbors import BallTree

    g = grid.copy()
    if azgs_gdf is None or azgs_gdf.empty:
        g["formation_diversity"] = 0
        return g
    centroids = azgs_gdf.geometry.representative_point()
    pts = np.deg2rad(
        np.column_stack([centroids.y.values, centroids.x.values])
    )
    tree = BallTree(pts, metric="haversine")
    gp = np.deg2rad(g[["lat", "lon"]].values)
    r = radius_km / 6371.0088
    counts = tree.query_radius(gp, r=r, count_only=True)
    g["formation_diversity"] = counts.astype(float)
    return g
