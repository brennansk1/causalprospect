"""Geographic helpers: bbox handling, H3 grid construction, CRS transforms."""

from __future__ import annotations

from dataclasses import dataclass

import h3
import numpy as np


@dataclass(frozen=True)
class BBox:
    min_lon: float
    min_lat: float
    max_lon: float
    max_lat: float

    def as_wfs(self) -> str:
        return f"{self.min_lon},{self.min_lat},{self.max_lon},{self.max_lat}"

    def as_ogc(self) -> str:
        # Some USGS WFS servers expect lat,lon,lat,lon order with EPSG:4326.
        return f"{self.min_lat},{self.min_lon},{self.max_lat},{self.max_lon}"

    def as_geojson(self) -> dict:
        return {
            "type": "Polygon",
            "coordinates": [[
                [self.min_lon, self.min_lat],
                [self.max_lon, self.min_lat],
                [self.max_lon, self.max_lat],
                [self.min_lon, self.max_lat],
                [self.min_lon, self.min_lat],
            ]],
        }


def h3_cells_covering(bbox: BBox, resolution: int = 7) -> list[str]:
    """Return all H3 cells (as string indexes) covering the bbox at given resolution."""
    polygon = h3.LatLngPoly(
        [
            (bbox.min_lat, bbox.min_lon),
            (bbox.min_lat, bbox.max_lon),
            (bbox.max_lat, bbox.max_lon),
            (bbox.max_lat, bbox.min_lon),
        ]
    )
    return list(h3.polygon_to_cells(polygon, res=resolution))


def cell_centroid_latlon(cell: str) -> tuple[float, float]:
    lat, lng = h3.cell_to_latlng(cell)
    return lat, lng


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0088
    phi1, phi2 = np.radians([lat1, lat2])
    dphi = phi2 - phi1
    dlam = np.radians(lon2 - lon1)
    a = np.sin(dphi / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlam / 2) ** 2
    return 2 * R * np.arcsin(np.sqrt(a))
