"""Microsoft Planetary Computer STAC — no auth, lazy-loaded COGs.

Gives us Sentinel-2 L2A, NASADEM/SRTM, and ASTER without downloading full
rasters. We request scenes via STAC search, sign the URLs, then use rasterio
with `GDAL_HTTP_MULTIRANGE=YES` to read only the study-area window.
"""

from __future__ import annotations

from datetime import datetime

import numpy as np

from ..utils.geo import BBox
from ..utils.logging import log

_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"


def _client():
    from pystac_client import Client
    import planetary_computer as pc

    return Client.open(_STAC, modifier=pc.sign_inplace)


def sentinel2_clear_composite(
    bbox: BBox,
    *,
    start: str = "2023-03-01",
    end: str = "2023-10-31",
    cloud_max: int = 15,
    bands: list[str] | None = None,
) -> dict:
    """Build a median cloud-free Sentinel-2 composite over the study area.

    Returns an xarray-backed DataArray via stackstac — doesn't materialize
    until we reduce. Typical AZ composite uses ~40-80 scenes.
    """
    import stackstac

    bands = bands or ["B02", "B03", "B04", "B08", "B11", "B12"]
    catalog = _client()
    search = catalog.search(
        collections=["sentinel-2-l2a"],
        bbox=[bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat],
        datetime=f"{start}/{end}",
        query={"eo:cloud_cover": {"lt": cloud_max}},
    )
    items = list(search.items())
    log.info("sentinel2.search", scenes=len(items))
    stack = stackstac.stack(
        items,
        bounds_latlon=(bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat),
        assets=bands,
        resolution=60,  # keep memory sane — 60m is plenty for regional prospectivity
        chunksize=2048,
    )
    composite = stack.median(dim="time", skipna=True).compute()
    return {"composite": composite, "scene_count": len(items), "bands": bands}


def dem_arizona(bbox: BBox, out_w: int = 160, out_h: int = 120) -> np.ndarray:
    """NASADEM elevation mosaic over the full bbox, downsampled to (out_h, out_w).

    NASADEM tiles are 1°×1°, so a 4°×3.5° bbox needs ~14-18 tiles. We pull all
    of them (no item cap), fill any remaining nodata via nearest-valid
    interpolation, then smooth mildly to avoid tile-join artifacts.
    """
    import rasterio
    from rasterio.merge import merge
    from scipy.ndimage import gaussian_filter, zoom

    catalog = _client()
    search = catalog.search(
        collections=["nasadem"],
        bbox=[bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat],
    )
    items = list(search.items())
    if not items:
        raise RuntimeError("no NASADEM items in bbox")
    datasets = []
    for it in items:
        asset = it.assets.get("elevation") or next(iter(it.assets.values()))
        datasets.append(rasterio.open(asset.href))
    try:
        mosaic, _transform = merge(
            datasets,
            bounds=(bbox.min_lon, bbox.min_lat, bbox.max_lon, bbox.max_lat),
            res=(bbox.max_lon - bbox.min_lon) / out_w,
            nodata=-32768,
        )
    finally:
        for d in datasets:
            d.close()
    dem = mosaic[0].astype(float)

    # Fill nodata (-32768) cells with the nearest valid elevation so the
    # rendered surface has no flat artifact plateaus.
    invalid = dem <= -1000
    if invalid.any():
        from scipy.ndimage import distance_transform_edt

        _, (iy, ix) = distance_transform_edt(invalid, return_indices=True)
        dem = dem[iy, ix]

    # Resample to target shape + mild smoothing (σ=0.6) to hide any residual
    # tile-boundary steps without blurring real terrain.
    zh = out_h / dem.shape[0]
    zw = out_w / dem.shape[1]
    dem = zoom(dem, (zh, zw), order=1)
    dem = gaussian_filter(dem, sigma=0.6)
    return dem
