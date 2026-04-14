# Data dictionary

Every raw data source pulled by the pipeline, its API endpoint, the fields we use, and the transformations applied. API-first — no account signup required.

## USGS MRDS — Mineral Resources Data System

- **Endpoint:** `https://mrdata.usgs.gov/services/wfs/mrds` (WFS 1.0.0 — 1.1.0 returns lat/lon-swapped geometries)
- **Typename:** `ms:mrds`
- **Output:** GML — we parse with GeoPandas/Fiona
- **AZ bbox yield:** 8,487 point records
- **Fields used:**
  - `dep_id` (str) — USGS deposit id, used as join key
  - `site_name` (str) — human-readable name, fuzzy-matched against canonical deposit list
  - `dev_stat` (str) — one of `Producer`, `Past Producer`, `Prospect`, `Occurrence`, `Plant`, `Unknown`. We filter to `Producer | Past Producer` for prospectivity target.
  - `code_list` (str) — space-separated commodity codes (CU, AU, AG, MO, etc.). Filtered to records containing `CU`.
  - `geometry` (Point) — WGS84 lat/lon

## USGS USMIN — Mine Features

- **Endpoint:** `https://mrdata.usgs.gov/services/wfs/usmin`
- **Typename:** `points`
- **AZ bbox yield:** 25,664 mine features
- **Usage:** visual context for the 3D scene; not used in modeling.

## USGS NGS — National Geochemical Survey

- **Endpoint:** `https://mrdata.usgs.gov/services/wfs/ngs`
- **Typename:** `ms:natgeochem`
- **AZ bbox yield:** 750 sample locations
- **Known limitation:** the WFS returns only metadata (gml_id, labno, fips_code, huc_code, url, geometry) — the actual geochemical assay values are not in the WFS response. Pulling values requires per-labno lookups which are not currently wired up. This is why the pipeline produces `Cu_ppm = NaN` and similar columns get dropped in feature engineering.

## USGS SGMC2 — State Geologic Map Compilation v2

- **Endpoint:** `https://mrdata.usgs.gov/services/wfs/sgmc2`
- **Typenames:** `Lithology` (2,543 polygons), `Structure` (2,707 faults/folds)
- **Fields used:**
  - Lithology: rock type classification (not currently consumed — future: one-hot encoded)
  - Structure: fault geometry → drives `distance_to_fault_m` and `fault_density`

## Macrostrat — Harmonized Geology API

- **Endpoint:** `https://macrostrat.org/api/v2/geologic_units/map`
- **Method:** GET with `lat`, `lng`, `scale=medium`
- **License:** CC-BY 4.0
- **Sampling:** 0.1° grid over AZ bbox → 1,400 sample points
- **Fields used:**
  - `lith` (str) — free-text lithology description. Keyword-matched against `{granit, diorite, intrus, porphyr, monzonit, granodiorit}` to produce `lith_intrusive` ∈ [0, 1].
  - `t_age`, `b_age` (Ma) — top and bottom ages of the geological unit. Averaged and IDW-interpolated onto the H3 grid as `geological_age_ma`.

## Arizona Geological Survey (AZGeo)

- **Endpoint:** `https://services6.arcgis.com/clPWQMwZfdWn4MQZ/arcgis/rest/services/Arizona_Geologic_Formations_2012/FeatureServer/0/query`
- **Method:** ArcGIS REST with `f=geojson` and bbox envelope
- **AZ bbox yield:** 1,884 formation polygons (paginated)
- **Fields used:**
  - `geometry` — used to compute `formation_diversity` per cell (count of distinct formations within 5 km)

## USGS Earth MRI Airborne Geophysics — AZ SE Porphyry Copper Belt Survey (2023–2024)

ScienceBase items:
- **Magnetic:** `680187e3d4be0263cab10a98`
- **Radiometric:** `68018832d4be0263cab10a9b`

Downloaded GeoTIFFs (sampled at cell centroids after reprojection from UTM Zone 12N to WGS 84):

| File | Feature column | Size |
|---|---|---|
| `AZ_SE_tmi.tif` | `magnetic_anomaly_TMI` | 58 MB |
| `AZ_SE_rtp.tif` | `magnetic_rtp` | 58 MB |
| `AZ_SE_K.tif` | `radiometric_K` | 58 MB |
| `AZ_SE_Th.tif` | `radiometric_Th` | 58 MB |
| `AZ_SE_U.tif` | `radiometric_U` | 58 MB |

## NASADEM via Microsoft Planetary Computer STAC

- **Endpoint:** `https://planetarycomputer.microsoft.com/api/stac/v1`
- **Collection:** `nasadem` — no account required
- **AZ bbox coverage:** ~18 tiles merged via `rasterio.merge`
- **Output:** 240 × 180 elevation grid in `data/processed/dem_nasadem.npy` (183 KB)
- **Fields used:** elevation in metres, ranges 33 m (Sonoran basin) → 3,290 m (Sky Island peaks)

## Engineered features

All derived from the raw columns above:

| Feature | Formula | Geological interpretation |
|---|---|---|
| `k_th_ratio` | `radiometric_K / radiometric_Th` | K-metasomatism indicator |
| `k_u_ratio` | `radiometric_K / radiometric_U` | alteration proxy |
| `th_u_ratio` | `radiometric_Th / radiometric_U` | U mobility proxy |
| `k_metasomatism_index` | `K / ((Th/Th_med) + (U/U_med))` | hydrothermal K enrichment |
| `magnetic_residual` | `magnetic_rtp − magnetic_anomaly_TMI` | isolates structural vs. remanent magnetization |
| `log_magnetic_*` | `log1p(v − min + 1)` | normalizes heavy-tailed airborne signal |
| `intrusive_x_fault` | `lith_intrusive × fault_density` | porphyry "sweet spot" (host rock × deformation) |
| `intrusive_near_fault` | `lith_intrusive / (1 + distance/1 km)` | same, distance-weighted |

## Target variable

`deposit_present ∈ {0, 1}` — 1 if the cell centroid is within 2 km of any MRDS record satisfying `code_list ∋ "CU"` AND `dev_stat ∈ {Producer, Past Producer}`. Yields 1,228 positive cells (5.1 %).
