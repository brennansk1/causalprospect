"""USGS Earth MRI geophysics via ScienceBase.

The Arizona Porphyry Copper Belt survey (2023-2024, Earth MRI) directly covers
our study area. ScienceBase item: 67fe127ed4be0201e1518b12. We pull the file
manifest, then lazy-load GeoTIFF grids with rasterio windowed reads so only
the study-area clip hits disk.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from ..utils.geo import BBox
from ..utils.http import get_json, get_bytes
from ..utils.logging import log

ARIZONA_PORPHYRY_ITEM = "67fe127ed4be0201e1518b12"
AZ_SE_MAGNETIC_ITEM = "680187e3d4be0263cab10a98"
AZ_SE_RADIOMETRIC_ITEM = "68018832d4be0263cab10a9b"
# The specific grids we use as features (small enough to store locally).
AZ_SE_PRIORITY_GRIDS = {
    "magnetic_anomaly_TMI": ("AZ_SE_tmi.tif", AZ_SE_MAGNETIC_ITEM),
    "magnetic_rtp": ("AZ_SE_rtp.tif", AZ_SE_MAGNETIC_ITEM),
    "radiometric_K": ("AZ_SE_K.tif", AZ_SE_RADIOMETRIC_ITEM),
    "radiometric_Th": ("AZ_SE_Th.tif", AZ_SE_RADIOMETRIC_ITEM),
    "radiometric_U": ("AZ_SE_U.tif", AZ_SE_RADIOMETRIC_ITEM),
}
_SB_BASE = "https://www.sciencebase.gov/catalog/item"


@dataclass
class SBFile:
    name: str
    url: str
    size_bytes: int
    content_type: str


def list_files(item_id: str = ARIZONA_PORPHYRY_ITEM) -> list[SBFile]:
    data = get_json(f"{_SB_BASE}/{item_id}", {"format": "json", "fields": "files"})
    files = data.get("files", []) or []
    out: list[SBFile] = []
    for f in files:
        out.append(
            SBFile(
                name=f.get("name", ""),
                url=f.get("downloadUri") or f.get("url", ""),
                size_bytes=int(f.get("size", 0)),
                content_type=f.get("contentType", ""),
            )
        )
    log.info("earthmri.manifest", item=item_id, files=len(out))
    return out


def download_grid(sb_file: SBFile, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / sb_file.name
    if path.exists() and path.stat().st_size == sb_file.size_bytes:
        return path
    log.info("earthmri.download", name=sb_file.name, size_mb=round(sb_file.size_bytes / 1e6, 1))
    path.write_bytes(get_bytes(sb_file.url, suffix=Path(sb_file.name).suffix.lstrip(".") or "bin", timeout=1200))
    return path


def clip_raster_to_bbox(src_path: Path, bbox: BBox, out_path: Path) -> Path:
    """Clip a downloaded grid to the AZ bbox using rasterio. Writes COG."""
    import rasterio
    from rasterio.mask import mask

    with rasterio.open(src_path) as src:
        geom = [bbox.as_geojson()]
        out_img, out_transform = mask(src, geom, crop=True)
        profile = src.profile.copy()
        profile.update(
            {
                "height": out_img.shape[1],
                "width": out_img.shape[2],
                "transform": out_transform,
                "driver": "GTiff",
                "compress": "deflate",
                "tiled": True,
            }
        )
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(out_img)
    log.info("earthmri.clipped", src=str(src_path), dst=str(out_path))
    return out_path
