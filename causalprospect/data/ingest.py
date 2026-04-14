"""End-to-end data ingestion orchestrator.

Entry point: `cp-download` (configured in pyproject.toml).
Everything is API-first and cached. Re-running is idempotent.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from ..utils.geo import BBox
from ..utils.logging import log
from . import azgs, earthmri, macrostrat, planetary, usgs
from .features import (
    compute_structural,
    engineer_features,
    join_azgs_density,
    join_deposits,
    join_geochemistry,
    join_macrostrat,
    join_raster_zonal,
)
from .grid import build_grid

ARIZONA_BBOX = BBox(min_lon=-113.0, min_lat=31.0, max_lon=-109.0, max_lat=34.5)


def run(bbox: BBox = ARIZONA_BBOX, root: Path = Path("./data")) -> Path:
    """Full ingest → feature matrix pipeline. Returns path to the processed parquet."""
    raw = root / "raw"
    processed = root / "processed"
    raw.mkdir(parents=True, exist_ok=True)
    processed.mkdir(parents=True, exist_ok=True)

    log.info("ingest.start", bbox=bbox)

    # 1. Vector layers from USGS WFS services.
    usgs_paths = usgs.save_all(bbox, raw / "usgs")

    # 2. AZGS geology polygons.
    try:
        azgs_gdf = azgs.fetch_formations(bbox)
        azgs_gdf.to_parquet(raw / "azgs_formations.parquet")
    except Exception as e:
        log.warning("azgs.failed", error=str(e))

    # 3. Macrostrat on a coarse sample grid (used to cross-validate AZGS lithology).
    try:
        mstrat = macrostrat.sample_grid(bbox, step_deg=0.1)
        mstrat.to_parquet(raw / "macrostrat_samples.parquet")
    except Exception as e:
        log.warning("macrostrat.failed", error=str(e))

    # 4. Earth MRI geophysics grids — magnetic + radiometric from the AZ SE
    # airborne survey. These grids already cover the porphyry belt footprint
    # so no bbox clipping is necessary.
    geophys_clips: dict[str, Path] = {}
    try:
        for feature_name, (filename, item_id) in earthmri.AZ_SE_PRIORITY_GRIDS.items():
            manifest = earthmri.list_files(item_id)
            match = next((f for f in manifest if f.name == filename), None)
            if match is None:
                log.warning("earthmri.missing", filename=filename)
                continue
            src = earthmri.download_grid(match, raw / "earthmri")
            geophys_clips[feature_name] = src
    except Exception as e:
        log.warning("earthmri.failed", error=str(e))

    # 5. Planetary Computer — NASADEM elevation mosaic at higher resolution
    # (~240×180) so the 3D scene resolves real Sky Island ridges.
    try:
        import numpy as np

        dem = planetary.dem_arizona(bbox, out_w=240, out_h=180)
        np.save(processed / "dem_nasadem.npy", dem)
        log.info("dem.saved", shape=dem.shape)
    except Exception as e:
        log.warning("dem.failed", error=str(e))

    # 6. Build the H3 grid and run feature joins.
    grid = build_grid(bbox, resolution=7)
    log.info("grid.built", cells=len(grid))

    import geopandas as gpd

    if "mrds" in usgs_paths:
        mrds = gpd.read_parquet(usgs_paths["mrds"])
        grid = join_deposits(grid, mrds, buffer_km=2.0)
    if "ngdb" in usgs_paths:
        ngdb = gpd.read_parquet(usgs_paths["ngdb"])
        grid = join_geochemistry(grid, ngdb)
    if "sgmc_structure" in usgs_paths:
        faults = gpd.read_parquet(usgs_paths["sgmc_structure"])
        grid = compute_structural(grid, faults)
    try:
        mstrat = pd.read_parquet(raw / "macrostrat_samples.parquet")
        grid = join_macrostrat(grid, mstrat)
    except FileNotFoundError:
        log.warning("macrostrat.parquet_missing")
    try:
        azgs_gdf = gpd.read_parquet(raw / "azgs_formations.parquet")
        grid = join_azgs_density(grid, azgs_gdf)
    except FileNotFoundError:
        log.warning("azgs.parquet_missing")
    for feature_name, raster_path in geophys_clips.items():
        grid = join_raster_zonal(grid, str(raster_path), feature_name)

    grid = engineer_features(grid)

    out_path = processed / "features_arizona.parquet"
    grid.to_parquet(out_path)
    log.info("ingest.complete", rows=len(grid), path=str(out_path))
    return out_path


def main() -> None:
    p = argparse.ArgumentParser(description="Ingest AZ porphyry copper belt data via public APIs")
    p.add_argument("--root", default="./data", help="Output root directory")
    args = p.parse_args()
    run(root=Path(args.root))


if __name__ == "__main__":
    main()
