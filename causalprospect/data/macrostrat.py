"""Macrostrat harmonized geology API.

https://macrostrat.org/api/ — JSON, no auth, CC-BY 4.0.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from ..utils.geo import BBox
from ..utils.http import get_json
from ..utils.logging import log

_BASE = "https://macrostrat.org/api/v2"


def geologic_units_at(lat: float, lon: float, *, scale: str = "medium") -> dict:
    data = get_json(f"{_BASE}/geologic_units/map", {"lat": lat, "lng": lon, "scale": scale})
    records = data.get("success", {}).get("data", [])
    return records[0] if records else {}


def sample_grid(bbox: BBox, *, step_deg: float = 0.05) -> pd.DataFrame:
    """Sample Macrostrat at a lat/lon grid and return lith + age per point."""
    lats = np.arange(bbox.min_lat, bbox.max_lat, step_deg)
    lons = np.arange(bbox.min_lon, bbox.max_lon, step_deg)
    rows = []
    for la in lats:
        for lo in lons:
            u = geologic_units_at(float(la), float(lo))
            rows.append(
                {
                    "lat": la,
                    "lon": lo,
                    "lith": u.get("lith", ""),
                    "strat_name": u.get("strat_name", ""),
                    "age_top": u.get("t_age"),
                    "age_bottom": u.get("b_age"),
                    "map_id": u.get("map_id"),
                }
            )
    log.info("macrostrat.sampled", points=len(rows))
    return pd.DataFrame(rows)
