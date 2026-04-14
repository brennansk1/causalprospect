"""Arizona Geological Survey geology via AZGeo ArcGIS FeatureServer.

Hosted at services6.arcgis.com (AGOL). GeoJSON output, no auth.
"""

from __future__ import annotations

import geopandas as gpd
import httpx
import pandas as pd

from ..utils.geo import BBox
from ..utils.logging import log

_FS = (
    "https://services6.arcgis.com/clPWQMwZfdWn4MQZ/arcgis/rest/services"
    "/Arizona_Geologic_Formations_2012/FeatureServer/0/query"
)


def fetch_formations(bbox: BBox, *, page_size: int = 2000) -> gpd.GeoDataFrame:
    """Paginate through Arizona Geologic Formations 2012."""
    offset = 0
    frames: list[gpd.GeoDataFrame] = []
    with httpx.Client(timeout=120, follow_redirects=True) as client:
        while True:
            params = {
                "where": "1=1",
                "geometry": f"{bbox.min_lon},{bbox.min_lat},{bbox.max_lon},{bbox.max_lat}",
                "geometryType": "esriGeometryEnvelope",
                "inSR": "4326",
                "outFields": "*",
                "returnGeometry": "true",
                "resultOffset": offset,
                "resultRecordCount": page_size,
                "f": "geojson",
            }
            r = client.get(_FS, params=params)
            r.raise_for_status()
            fc = r.json()
            feats = fc.get("features", [])
            if not feats:
                break
            frames.append(gpd.GeoDataFrame.from_features(feats, crs="EPSG:4326"))
            log.info("azgs.page", offset=offset, rows=len(feats))
            if len(feats) < page_size:
                break
            offset += page_size
    return pd.concat(frames, ignore_index=True) if frames else gpd.GeoDataFrame()
