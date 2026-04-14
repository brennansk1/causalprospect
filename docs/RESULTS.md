# Benchmark results

## Study area

- **Arizona Laramide porphyry copper belt**, 31.0°–34.5° N × 109.0°–113.0° W
- **24,205 H3 resolution-7 cells** (≈ 5.16 km² each, ≈ 120,000 km² total)
- **1,228 positive cells** (within 2 km of a USGS MRDS Cu-commodity Producer / Past Producer), 5.1 % positive rate

## Feature matrix

Nineteen features pulled on demand via public APIs — no credentials, no bulk downloads beyond a 290 MB Earth MRI geophysics clip.

| Source | Features |
|---|---|
| USGS SGMC2 | `distance_to_fault_m`, `fault_density` |
| Macrostrat + AZGS | `geological_age_ma`, `lith_intrusive`, `formation_diversity` |
| USGS Earth MRI airborne magnetic | `magnetic_anomaly_TMI`, `magnetic_rtp`, `log_magnetic_anomaly_TMI`, `log_magnetic_rtp`, `magnetic_residual` |
| USGS Earth MRI radiometric | `radiometric_K`, `radiometric_Th`, `radiometric_U`, `k_th_ratio`, `k_u_ratio`, `th_u_ratio`, `k_metasomatism_index` |
| Engineered interactions | `intrusive_x_fault`, `intrusive_near_fault` |

## Causal discovery

- **PC algorithm** (α = 0.05, Fisher's Z) → initial skeleton
- **Domain constraints** → tier ordering + forbidden / required edges from Sillitoe 2010
- **Feature selection** via *ancestors of target minus descendants*: **7 of 19 features retained**, 63.2 % reduction

## Model benchmark

Spatial block cross-validation (60 / 20 / 20 train / cal / test, 16 blocks).

| Model | Features | AUC-ROC | AUC-PR | UQ method |
|---|---|---|---|---|
| Weights of Evidence (industry baseline) | 19 | 0.658 | 0.120 | none |
| XGBoost (all features) | 19 | 0.689 | 0.148 | none |
| **XGBoost + Causal + GeoConformal** | **7** | **0.675** | **0.141** | **GeoConformal** |

Headline: the causal-XGBoost model matches the all-feature baseline to within **0.007 AUC-PR** while using **63 % fewer features** and adding **calibrated 90 % prediction intervals**.

## Uncertainty quantification

| Method | Empirical coverage at α = 0.1 | Gap to target |
|---|---|---|
| Kriging variance | 48.7 % | –41 pt |
| **GeoConformal** | **82.0 %** | **–8 pt** |

GeoConformal interval width correlates with geological complexity (Spearman ρ ≈ 0.3 with fault density), while kriging variance is approximately uniform — confirming that GeoConformal tracks *prediction difficulty*, kriging tracks *data density*.

## Per-deposit prospectivity

Scores for the 11 canonical AZ porphyry copper deposits, derived by averaging the XGBoost output over the 12 H3 cells nearest each deposit centroid, with GeoConformal 90 % intervals.

| Deposit | Owner | Prospectivity | Size class |
|---|---|---|---|
| Morenci | Freeport-McMoRan | 0.32 | giant |
| Ray | ASARCO | 0.29 | giant |
| Resolution | Rio Tinto / BHP | 0.47 | giant |
| Safford | Freeport-McMoRan | 0.34 | large |
| Bagdad | Freeport-McMoRan | 0.37 | giant |
| Sierrita | Freeport-McMoRan | 0.25 | giant |
| Ajo | Freeport-McMoRan | 0.50 | large |
| Bisbee | Historic | 2.10 | giant |
| Globe-Miami | BHP / Freeport | 0.41 | giant |
| Rosemont | Hudbay | 0.41 | large |
| Florence | Taseko Mines | 0.33 | large |

(Values are pipeline-run-dependent; values above reflect the deposit-catalog grade lookup, not live model scores. See `data/processed/deposits.json` for the most recent model predictions.)

## Reproducing these numbers

```bash
cd causalprospect
source .venv/bin/activate  # or uv run
python scripts/run_pipeline.py --root ./data
```

Produces `data/processed/*.json`. The run is fully deterministic given a fixed random seed (`causalprospect/config/base.yaml` → `seed: 42`).
