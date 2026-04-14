"""H3 hexagonal grid builder for the study area."""

from __future__ import annotations

import h3
import numpy as np
import pandas as pd

from ..utils.geo import BBox, h3_cells_covering


def build_grid(bbox: BBox, resolution: int = 7) -> pd.DataFrame:
    cells = h3_cells_covering(bbox, resolution=resolution)
    rows = []
    for c in cells:
        lat, lng = h3.cell_to_latlng(c)
        rows.append({"cell": c, "lat": lat, "lon": lng, "resolution": resolution})
    return pd.DataFrame(rows)


def cell_neighbors(cells: list[str], k: int = 1) -> list[tuple[str, str]]:
    """Return undirected edges within k rings for graph construction."""
    edges: set[tuple[str, str]] = set()
    cellset = set(cells)
    for c in cells:
        for n in h3.grid_disk(c, k):
            if n != c and n in cellset:
                edges.add(tuple(sorted((c, n))))
    return list(edges)
