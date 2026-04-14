"""Canonical Arizona porphyry copper deposit catalog.

Cross-references the design document's 11 headline deposits (from USGS MRDS,
company annual reports, and Porter GeoConsultancy database) against the live
MRDS WFS fetch so geometry comes from the authoritative source while
grade/tonnage/ownership come from the published literature.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from difflib import SequenceMatcher

import geopandas as gpd


@dataclass
class CanonicalDeposit:
    id: str
    name: str
    aliases: tuple[str, ...]
    owner: str
    grade_pct: float
    tonnage_mt: float
    deposit_type: str
    status: str
    size_class: str  # 'small' | 'medium' | 'large' | 'giant'
    fallback_lat: float
    fallback_lon: float


CANONICAL: tuple[CanonicalDeposit, ...] = (
    CanonicalDeposit("morenci", "Morenci", ("Morenci Mine",), "Freeport-McMoRan", 0.32, 7400, "Porphyry Cu-Mo", "Operating", "giant", 33.075, -109.365),
    CanonicalDeposit("ray", "Ray", ("Ray Mine",), "ASARCO", 0.29, 1800, "Porphyry Cu", "Operating", "giant", 33.185, -111.01),
    CanonicalDeposit("resolution", "Resolution", ("Resolution Copper",), "Rio Tinto / BHP", 1.47, 1700, "Porphyry Cu-Mo", "Development", "giant", 33.305, -111.095),
    CanonicalDeposit("safford", "Safford", ("Safford Mine", "Dos Pobres"), "Freeport-McMoRan", 0.34, 890, "Porphyry Cu", "Operating", "large", 32.97, -109.50),
    CanonicalDeposit("bagdad", "Bagdad", ("Bagdad Mine",), "Freeport-McMoRan", 0.37, 4200, "Porphyry Cu-Mo", "Operating", "giant", 34.58, -113.17),
    CanonicalDeposit("sierrita", "Sierrita", ("Sierrita Mine", "Esperanza"), "Freeport-McMoRan", 0.25, 2900, "Porphyry Cu-Mo", "Operating", "giant", 31.90, -111.11),
    CanonicalDeposit("ajo", "Ajo", ("New Cornelia",), "Freeport-McMoRan", 0.50, 680, "Porphyry Cu", "Past Producer", "large", 32.37, -112.86),
    CanonicalDeposit("bisbee", "Bisbee", ("Warren District",), "Historic (Phelps Dodge)", 2.10, 3600, "Porphyry / Skarn Cu", "Past Producer", "giant", 31.45, -109.92),
    CanonicalDeposit("globe_miami", "Globe-Miami", ("Miami", "Pinto Valley"), "BHP / Freeport", 0.41, 5100, "Porphyry Cu", "Operating", "giant", 33.40, -110.85),
    CanonicalDeposit("rosemont", "Rosemont", ("Copper World",), "Hudbay Minerals", 0.41, 590, "Porphyry Cu-Mo", "Permitted", "large", 31.82, -110.75),
    CanonicalDeposit("florence", "Florence", ("Florence Copper",), "Taseko Mines", 0.33, 520, "Porphyry Cu (ISR)", "Development", "large", 33.01, -111.39),
)


def _similar(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def resolve_from_mrds(mrds: gpd.GeoDataFrame) -> list[dict]:
    """Find the canonical 11 deposits in a fetched MRDS GeoDataFrame.

    Uses fuzzy matching on `site_name`, then falls back to the hand-digitized
    coordinates from published company sources if no MRDS record clears the
    similarity threshold.
    """
    out: list[dict] = []
    names = mrds["site_name"].fillna("").astype(str) if "site_name" in mrds else None
    for dep in CANONICAL:
        lat, lon = dep.fallback_lat, dep.fallback_lon
        matched = False
        if names is not None:
            candidates = [dep.name, *dep.aliases]
            best = (0.0, -1)
            for i, n in enumerate(names):
                for cand in candidates:
                    s = _similar(n, cand)
                    if s > best[0]:
                        best = (s, i)
            if best[0] > 0.65:
                row = mrds.iloc[best[1]]
                g = row.geometry
                lat, lon = float(g.y), float(g.x)
                matched = True
        out.append(
            {
                **asdict(dep),
                "lat": lat,
                "lon": lon,
                "mrds_matched": matched,
            }
        )
    return out
