"""Domain-constrained DAG templates for porphyry copper mineral systems.

These constraints encode geological knowledge that raw data-driven causal
discovery (PC, SGC) has no way to recover from finite samples. They are applied
as forbidden/required edges and a tier ordering during DAG construction.

References:
- Sillitoe (2010). Porphyry copper systems. *Economic Geology* 105(1).
- Cooke et al. (2014). Mineral systems framework. *Minerals*.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CausalConstraints:
    forbidden_edges: list[tuple[str, str]]
    required_edges: list[tuple[str, str]]
    tier_ordering: list[str]
    tier_membership: dict[str, str] = field(default_factory=dict)


PORPHYRY_COPPER = CausalConstraints(
    forbidden_edges=[
        # Surface / geomorphic features cannot causally affect deep processes.
        ("ndvi", "intrusion_depth"),
        ("elevation", "magmatic_composition"),
        ("sentinel2_feox_ratio", "sulfide_content"),
        ("slope", "geological_age"),
        ("terrain_ruggedness", "fault_density"),
        # Measurement noise cannot cause the underlying geology.
        ("magnetic_anomaly_TMI", "intrusion_present"),
        ("Cu_ppm", "alteration_intensity"),
    ],
    required_edges=[
        # Magmatic intrusion creates a contact metamorphic aureole.
        ("intrusion_present", "contact_aureole"),
        # Hydrothermal alteration drives geochemical anomalies.
        ("alteration_intensity", "Cu_ppm"),
        ("alteration_intensity", "Mo_ppm"),
        # Sulfide mineralization destroys magnetite, producing a magnetic low.
        ("sulfide_content", "magnetic_low"),
        # Structural intersections focus fluids and vein density.
        ("fault_intersection_density", "vein_density"),
        # K-metasomatism elevates K and depresses Th.
        ("alteration_intensity", "k_th_ratio"),
    ],
    tier_ordering=[
        "TECTONIC",
        "MAGMATIC",
        "STRUCTURAL",
        "HYDROTHERMAL",
        "MINERALIZATION",
        "SUPERGENE",
        "GEOMORPHIC",
        "MEASUREMENT",
    ],
    tier_membership={
        # Latent tectonic / magmatic / hydrothermal concepts — proxied through
        # the observed features below but retained here so the DAG picture
        # reflects the full mineral system framework.
        "subduction_zone": "TECTONIC",
        "felsic_intrusion": "MAGMATIC",
        "intrusion_present": "MAGMATIC",
        "intrusion_depth": "MAGMATIC",
        "magmatic_composition": "MAGMATIC",
        "lith_intrusive": "MAGMATIC",  # AZGS/Macrostrat-derived proxy
        "geological_age_ma": "MAGMATIC",  # rocks of Laramide age are magmatic hosts
        "fault_density": "STRUCTURAL",
        "fault_intersection_density": "STRUCTURAL",
        "distance_to_fault_m": "STRUCTURAL",
        "formation_diversity": "STRUCTURAL",  # lithological juxtaposition proxy
        "structural_control": "STRUCTURAL",
        "alteration_intensity": "HYDROTHERMAL",
        "fluid_focusing": "HYDROTHERMAL",
        "contact_aureole": "HYDROTHERMAL",
        "radiometric_K": "HYDROTHERMAL",   # K-metasomatism is the porphyry signature
        "sulfide_content": "MINERALIZATION",
        "vein_density": "MINERALIZATION",
        "deposit_present": "MINERALIZATION",
        # Airborne geophysics — proxies for deeper processes, classified as
        # measurements of the underlying magmatic / alteration state.
        "magnetic_anomaly_TMI": "MEASUREMENT",
        "magnetic_rtp": "MEASUREMENT",
        "magnetic_low": "MEASUREMENT",
        "bouguer_gravity_anomaly": "MEASUREMENT",
        "radiometric_Th": "MEASUREMENT",
        "radiometric_U": "MEASUREMENT",
        "k_th_ratio": "HYDROTHERMAL",
        "k_u_ratio": "HYDROTHERMAL",
        "th_u_ratio": "MEASUREMENT",
        "k_metasomatism_index": "HYDROTHERMAL",
        "magnetic_residual": "MEASUREMENT",
        "log_magnetic_anomaly_TMI": "MEASUREMENT",
        "log_magnetic_rtp": "MEASUREMENT",
        "intrusive_x_fault": "STRUCTURAL",
        "intrusive_near_fault": "STRUCTURAL",
        "Cu_ppm": "MEASUREMENT",
        "Mo_ppm": "MEASUREMENT",
        "aster_aloh_abundance": "MEASUREMENT",
        "sentinel2_feox_ratio": "MEASUREMENT",
        "ndvi": "MEASUREMENT",
        "elevation": "GEOMORPHIC",
        "slope": "GEOMORPHIC",
        "terrain_ruggedness": "GEOMORPHIC",
    },
)


def is_forbidden_by_tier(src: str, dst: str, c: CausalConstraints) -> bool:
    """An edge src -> dst is forbidden if dst's tier is strictly upstream of src's."""
    src_tier = c.tier_membership.get(src)
    dst_tier = c.tier_membership.get(dst)
    if not src_tier or not dst_tier or src_tier == dst_tier:
        return False
    return c.tier_ordering.index(dst_tier) < c.tier_ordering.index(src_tier)
