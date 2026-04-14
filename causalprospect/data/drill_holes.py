"""Drill-hole generation from published porphyry grade profiles.

No public API exposes NI 43-101 / S-K 1300 drill-hole databases for the
named Arizona deposits. This module builds plausible hole patterns from
each deposit's published headline grade and size class, following the
canonical porphyry copper grade envelope (Sillitoe 2010, *Economic
Geology* 105(1)):

  0–50 m:    barren leached cap (< 0.02 % Cu)
  50–250 m:  supergene chalcocite blanket (0.5×–2× headline grade)
  250–600 m: primary hypogene chalcopyrite (0.7×–1.1× headline grade)
  600+ m:    declining tails into potassic core

Collars cluster within ~1 km of the deposit centroid with representative
azimuths / dips and are seeded deterministically by deposit id so the
pattern is stable across pipeline runs.

Dashboards should label these as **representative**, not measured — see
DepositInspector.tsx.
"""

from __future__ import annotations

import hashlib
from dataclasses import asdict, dataclass

import numpy as np


@dataclass
class DrillInterval:
    from_m: float
    to_m: float
    cu_pct: float


@dataclass
class DrillHole:
    id: str
    deposit_id: str
    lat: float
    lon: float
    azimuth_deg: float
    dip_deg: float
    total_depth_m: float
    collar_elevation_m: float
    intervals: list[DrillInterval]


# Porphyry depth envelope (fraction of total hole depth, representative
# Cu grade multiplier on headline).
_ENVELOPE = [
    (0.00, 0.06, 0.02),   # barren leached cap
    (0.06, 0.14, 0.7),    # transition to enrichment
    (0.14, 0.32, 1.8),    # supergene blanket — highest grade
    (0.32, 0.55, 1.1),    # hypogene chalcopyrite
    (0.55, 0.80, 0.9),    # declining hypogene
    (0.80, 1.00, 0.5),    # deep tail
]

_AZIMUTHS = [0, 45, 90, 135, 180, 225, 270, 315]
_DIPS = [-60, -65, -70, -75, -80, -85]


def _seed(deposit_id: str) -> np.random.Generator:
    h = hashlib.sha256(deposit_id.encode()).digest()
    return np.random.default_rng(int.from_bytes(h[:8], "big") % (2**32))


def _depth_for_size(size_class: str, rng: np.random.Generator) -> float:
    """Typical hole lengths by deposit size class (published NI 43-101 averages)."""
    base = {"small": 350, "medium": 600, "large": 900, "giant": 1400}.get(size_class, 700)
    return float(base * rng.uniform(0.8, 1.2))


def _holes_per_deposit(size_class: str) -> int:
    return {"small": 3, "medium": 5, "large": 6, "giant": 8}.get(size_class, 5)


def _build_intervals(total_depth: float, headline_grade: float, rng: np.random.Generator) -> list[DrillInterval]:
    """30 m intervals along the hole, grade sampled from the porphyry envelope
    with log-normal noise so each hole has realistic heterogeneity."""
    intervals: list[DrillInterval] = []
    step = 30.0
    from_m = 0.0
    while from_m < total_depth:
        to_m = min(from_m + step, total_depth)
        frac = (from_m + step / 2) / total_depth
        mult = 1.0
        for lo, hi, m in _ENVELOPE:
            if lo <= frac < hi:
                mult = m
                break
        # Log-normal jitter — ±50% swing, heavy tail toward bonanza.
        cu = headline_grade * mult * float(np.exp(rng.normal(0.0, 0.35)))
        cu = max(0.0, min(cu, 6.0))
        intervals.append(DrillInterval(from_m=round(from_m, 1), to_m=round(to_m, 1), cu_pct=round(cu, 3)))
        from_m = to_m
    return intervals


def generate_for_deposit(deposit: dict) -> list[DrillHole]:
    """Create N plausible drill holes clustered around a deposit centroid."""
    rng = _seed(deposit["id"])
    out: list[DrillHole] = []
    n_holes = _holes_per_deposit(deposit.get("size_class", "medium"))
    headline = float(deposit.get("grade_pct", 0.3))
    for i in range(n_holes):
        # Cluster within ~1 km of the deposit (1 km ≈ 0.009°).
        dlat = rng.normal(0, 0.006)
        dlon = rng.normal(0, 0.006)
        depth = _depth_for_size(deposit.get("size_class", "medium"), rng)
        az = float(rng.choice(_AZIMUTHS)) + float(rng.uniform(-5, 5))
        dip = float(rng.choice(_DIPS))
        hole_id = f"{deposit['id'][:3].upper()}-{24000 + i:04d}"
        out.append(
            DrillHole(
                id=hole_id,
                deposit_id=deposit["id"],
                lat=float(deposit["lat"]) + dlat,
                lon=float(deposit["lon"]) + dlon,
                azimuth_deg=round(az, 1),
                dip_deg=round(dip, 1),
                total_depth_m=round(depth, 1),
                collar_elevation_m=0.0,  # backfilled from NASADEM downstream if available
                intervals=_build_intervals(depth, headline, rng),
            )
        )
    return out


def generate_all(deposits: list[dict]) -> list[dict]:
    all_holes: list[DrillHole] = []
    for d in deposits:
        all_holes.extend(generate_for_deposit(d))
    return [
        {
            **asdict(h),
            "intervals": [asdict(iv) for iv in h.intervals],
        }
        for h in all_holes
    ]
