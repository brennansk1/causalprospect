"""USGS MRDS / USMIN / NGDB / SGMC2 ingestion via MapServer WFS.

Gotchas (discovered empirically — see DATA_DICTIONARY.md):
- Endpoints only return GML, not JSON. We parse with GeoPandas/Fiona.
- WFS 1.1.0 expects lat,lon axis order when CRS is EPSG:4326.
- The original `/mrds/wfs` path is dead; real base is `/services/wfs/<layer>`.
"""

from __future__ import annotations

from io import BytesIO
from pathlib import Path

import geopandas as gpd
import pandas as pd

from ..utils.geo import BBox
from ..utils.http import get_bytes
from ..utils.logging import log

_WFS_BASE = "https://mrdata.usgs.gov/services/wfs"


def _wfs_fetch(service: str, typename: str, bbox: BBox, *, max_features: int | None = None) -> gpd.GeoDataFrame:
    """Fetch a WFS layer as GML and parse into a GeoDataFrame.

    USGS MapServer WFS 1.0.0 returns coordinates in lon,lat order (GeoPandas
    convention) whereas 1.1.0 returns lat,lon per the EPSG:4326 axis spec.
    We use 1.0.0 so the geometry comes back ready to use without swapping.
    """
    params = {
        "service": "WFS",
        "version": "1.0.0",
        "request": "GetFeature",
        "typename": typename,
        "bbox": f"{bbox.min_lon},{bbox.min_lat},{bbox.max_lon},{bbox.max_lat}",
    }
    if max_features:
        params["maxfeatures"] = str(max_features)
    url = f"{_WFS_BASE}/{service}"
    log.info("wfs_fetch.start", service=service, typename=typename)
    gml = get_bytes(url, params, suffix="gml", timeout=300.0)
    gdf = gpd.read_file(BytesIO(gml))
    if gdf.crs is None:
        gdf = gdf.set_crs("EPSG:4326")
    log.info("wfs_fetch.done", service=service, features=len(gdf))
    return gdf


def fetch_mrds(bbox: BBox) -> gpd.GeoDataFrame:
    """Mineral Resources Data System — deposit point records."""
    return _wfs_fetch("mrds", "ms:mrds", bbox)


def fetch_usmin(bbox: BBox) -> gpd.GeoDataFrame:
    """US Mine Features — mine point records."""
    return _wfs_fetch("usmin", "points", bbox)


def fetch_ngdb_geochem(bbox: BBox) -> gpd.GeoDataFrame:
    """National Geochemical Survey — stream sediment / soil geochem points."""
    return _wfs_fetch("ngs", "ms:natgeochem", bbox)


def fetch_sgmc_lithology(bbox: BBox) -> gpd.GeoDataFrame:
    """State Geologic Map Compilation v2 — lithology polygons."""
    return _wfs_fetch("sgmc2", "Lithology", bbox)


def fetch_sgmc_structure(bbox: BBox) -> gpd.GeoDataFrame:
    """SGMC structure layer — faults and structural features."""
    return _wfs_fetch("sgmc2", "Structure", bbox)


def save_all(bbox: BBox, out_dir: Path) -> dict[str, Path]:
    """Convenience: fetch all USGS layers for the bbox and write as GeoParquet."""
    out_dir.mkdir(parents=True, exist_ok=True)
    layers = {
        "mrds": fetch_mrds,
        "usmin": fetch_usmin,
        "ngdb": fetch_ngdb_geochem,
        "sgmc_lithology": fetch_sgmc_lithology,
        "sgmc_structure": fetch_sgmc_structure,
    }
    paths: dict[str, Path] = {}
    for name, fn in layers.items():
        try:
            gdf = fn(bbox)
            path = out_dir / f"{name}.parquet"
            gdf.to_parquet(path)
            paths[name] = path
        except Exception as e:
            log.warning("wfs_fetch.failed", layer=name, error=str(e))
    return paths
