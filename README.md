# CausalProspect

**Causal discovery–enhanced critical mineral prospectivity with conformal prediction.**
An open-source Python pipeline and interactive 3D dashboard that discovers *why* minerals form where they do — not just *where* — and wraps every prediction in distribution-free coverage intervals.

Built around the Arizona Laramide porphyry copper belt and its 11 major deposits (Morenci, Resolution, Bagdad, Safford, Sierrita, Ray, Bisbee, Globe-Miami, Rosemont, Ajo, Florence).

![3D topographic prospectivity map](docs/screenshots/3d-overview.png)

## Why this exists

The mining industry spends **$12.4 B / year** on mineral exploration at a success rate below 0.05 %. Grassroots discovery rates have fallen ~75 % in a decade. Dominant methods — ordinary kriging (1960s) and weights-of-evidence (1980s) — treat geological features as correlates, not causes, producing models that don't transfer across terranes and whose uncertainty estimates track *data density*, not *prediction difficulty*.

Meanwhile the U.S. faces a critical-minerals crisis: 60 commodities on the USGS critical list, import dependence > 50 % for 31 of them, and copper demand projected to hit 30 Mt / year by 2030 (each EV needs ~80 kg). The $320 M Earth MRI program is pulling in new data — but the analytics haven't changed.

**CausalProspect** is what the next-generation prospectivity tool looks like:

1. **Discovers causal structure** via the PC algorithm + Spatial Granger Causality + domain constraints from published porphyry-copper geology.
2. **Builds causally-informed prospectivity models** — features selected by d-separation, not by SHAP.
3. **Wraps every prediction in GeoConformal intervals** — distribution-free finite-sample coverage that adapts to local geological complexity.
4. **Renders everything in an interactive 3D topographic dashboard** — real NASADEM relief, 11 named deposits on their actual locations, 8,487 real MRDS occurrences, drill-hole detail, and a live causal DAG.

Only ~2 papers worldwide have combined causal discovery with mineral prospectivity. **Zero** have combined it with conformal prediction. **Zero** have shipped an interactive tool around it. This is the first.

## What the dashboard shows

### 1 · 3D geological model

Real NASADEM topography with 5× vertical exaggeration to make Sky Island relief legible at overview zoom. Elevation contours every 250 m, bold at every 1000 m. US/Mexico border, state lines, major interstates, Gila and Salt rivers. Phoenix, Tucson, and eight other cities as orientation anchors. All 11 canonical porphyry copper deposits rendered with pulsing copper markers on their USGS MRDS-resolved positions.

![3D with all layers, rotated view](docs/screenshots/3d-rotated.png)

Toggle the prospectivity overlay to see the causal-XGBoost + GeoConformal prediction surface laid across the topography:

![Prospectivity overlay](docs/screenshots/3d-prospectivity.png)

Drill-hole detail visible when zoomed in — color-coded Cu grade intervals along each inclined trace:

![Deposit-inspector view](docs/screenshots/3d-deposit-selected.png)

### 2 · Causal DAG

Six-tier mineral-system DAG recovered from data + constrained by published porphyry geology. Click a node to highlight its causal parents and descendants; the right panel reports d-separation results.

![Causal DAG](docs/screenshots/causal-dag.png)

### 3 · Model benchmark

Success-rate curves, head-to-head AUC table, and feature-count chart. The causal model matches the all-feature baseline to within 0.007 AUC-PR while using 63 % fewer features and adding calibrated intervals.

![Benchmark tab](docs/screenshots/benchmark.png)

### 4 · Uncertainty QC

Calibration curve (GeoConformal vs. kriging variance vs. ideal), methodology comparison, and side-by-side spatial uncertainty maps.

![Uncertainty tab](docs/screenshots/uncertainty.png)

## Data sources — all API-first, no account required

| Source | Endpoint | Records (AZ bbox) |
|---|---|---|
| USGS MRDS | `mrdata.usgs.gov/services/wfs/mrds` | **8,487** mineral deposits |
| USGS USMIN | `mrdata.usgs.gov/services/wfs/usmin` | 25,664 mine features |
| USGS SGMC2 (lithology + structure) | `mrdata.usgs.gov/services/wfs/sgmc2` | 5,250 polygons / faults |
| USGS Earth MRI (AZ SE porphyry belt survey) | ScienceBase items `680187e3…` (mag) + `68018832…` (rad) | 5 × 58 MB GeoTIFFs |
| Macrostrat (harmonized geology) | `macrostrat.org/api/v2/geologic_units/map` | 1,400 sampled units |
| AZGS Arizona geologic formations | `services6.arcgis.com/.../Arizona_Geologic_Formations_2012` | 1,884 formations |
| NASADEM elevation | Microsoft Planetary Computer STAC | 240 × 180 elevation mosaic |

## Results

| Model | Features | AUC-ROC | AUC-PR | UQ method |
|---|---|---|---|---|
| Weights of Evidence (industry baseline) | 19 | 0.658 | 0.120 | none |
| XGBoost (all features) | 19 | 0.689 | 0.148 | none |
| **XGBoost + Causal + GeoConformal** | **7** | **0.675** | **0.141** | **GeoConformal** |

- **63.2 % feature reduction** from data-driven causal discovery + domain constraints
- **GeoConformal coverage 82 %** at α = 0.1 vs. kriging variance at 49 %
- **24,205 grid cells** over 120,000 km² study area
- **1,228 positive cells** (5.1 %) — Cu-commodity Producer / Past Producer within 2 km

See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the full mathematical treatment, [`docs/RESULTS.md`](docs/RESULTS.md) for the benchmark tables, and [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) for every field.

## Quick start

```bash
# 1. Python env + install (uses uv; plain pip works too)
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e .[dev]
brew install libomp                       # required by XGBoost on macOS

# 2. Pull real data + train + produce dashboard artifacts (~2 min)
python scripts/run_pipeline.py --root ./data

# 3. Copy JSON artifacts into the dashboard public folder
cp data/processed/*.json dashboard/public/data/

# 4. Run the dashboard
cd dashboard
npm install
npm run dev                               # http://localhost:5173

# 5. (optional) Run the FastAPI backend
uvicorn causalprospect.api.main:app --reload --port 8000
```

### Docker

```bash
docker compose up
# Dashboard at http://localhost:5173 · API at http://localhost:8000
```

### Tests

```bash
pytest                                    # 26 passing (causal, conformal, features, drill holes)
```

## Repository layout

```
causalprospect/
├── causalprospect/             # Python package
│   ├── data/                   # API-first ingestion (usgs, macrostrat, azgs, earthmri, planetary)
│   ├── causal/                 # PC algorithm + SGC + domain-constrained DAG + feature selection
│   ├── models/                 # WoE baseline, XGBoost (causal), Graph Attention Network
│   ├── uncertainty/            # GeoConformal predictor + calibration diagnostics
│   ├── evaluation/             # Spatial-block CV, success-rate curves, AUC-ROC/PR
│   ├── api/                    # FastAPI backend (serves processed JSON to dashboard)
│   └── utils/                  # HTTP caching, H3/CRS helpers, structured logging
├── scripts/run_pipeline.py     # end-to-end runner → writes data/processed/*.json
├── dashboard/                  # React + TypeScript + R3F dashboard (4 tabs)
├── docs/                       # METHODOLOGY, RESULTS, DATA_DICTIONARY, screenshots
├── tests/                      # pytest suite
├── Dockerfile + docker-compose.yml  # one-command deploy
└── data/                       # raw/, processed/, cache/ — git-ignored
```

## Target audience

Built to target mining industry data science / ML roles at **Freeport-McMoRan**, **Rio Tinto Kennecott**, **BHP**, **KoBold Metals**, **Earth AI**, **Hudbay Minerals**, **USGS Earth MRI**, and **SRK Consulting**. See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for the full methodological pitch.

## License

MIT. Raw data is subject to each provider's license (USGS / Macrostrat / AZGS / NASADEM are all open).

## Author

**Brennan Skanski** · April 2026 · [LinkedIn](https://www.linkedin.com/in/brennan-skanski) · Salt Lake City, Utah
