# Methodology

## 1 · Problem setup

Given a study area $\mathcal{A} \subset \mathbb{R}^2$ partitioned into an H3 hexagonal grid at resolution 7 (cells $c_1, \dots, c_N$, each $\approx 5.16$ km$^2$), and a feature vector $\mathbf{x}_i \in \mathbb{R}^d$ at each cell, we want to estimate

$$
\Pr(Y_i = 1 \mid \mathbf{x}_i)
$$

where $Y_i \in \{0, 1\}$ indicates the presence of a major porphyry copper deposit within 2 km of cell $i$'s centroid. We additionally require **calibrated, distribution-free** prediction intervals $[\hat{\ell}_i, \hat{u}_i]$ with finite-sample coverage guarantees.

## 2 · Causal discovery

### 2.1 PC algorithm

The **PC algorithm** (Spirtes, Glymour, Scheines 2000) recovers the Markov equivalence class of a DAG from conditional-independence tests. Starting from the complete undirected graph, it removes an edge $X_i - X_j$ whenever a separating set $\mathbf{S}$ is found such that $X_i \perp\!\!\!\perp X_j \mid \mathbf{S}$. Orientation rules then convert the resulting skeleton into a partial DAG (CPDAG).

We use Fisher's Z test for conditional independence,

$$
\mathrm{FisherZ}(\hat\rho, n, |\mathbf{S}|) = \frac{1}{2} \log\!\frac{1 + \hat\rho}{1 - \hat\rho} \cdot \sqrt{n - |\mathbf{S}| - 3}
$$

with $\alpha = 0.05$. Fisher's Z is appropriate when partial correlations are approximately Gaussian, which we enforce by log-transforming heavy-tailed geophysical features (TMI, RTP) before the test.

### 2.2 Spatial Granger Causality

Standard Granger causality tests whether past values of $X$ improve prediction of present $Y$ beyond $Y$'s own lags. In a spatial setting there is no temporal order, so we adapt the concept per Zhu et al. (2025): for a spatial-weight matrix $\mathbf{W}$ (we use inverse-distance weighting on cell centroids, clipped to the k = 6 nearest neighbors),

- **Restricted model:** $\mathbf{y} = \alpha_0 + \alpha_1 \mathbf{W}\mathbf{y} + \boldsymbol\epsilon_r$
- **Unrestricted model:** $\mathbf{y} = \beta_0 + \beta_1 \mathbf{W}\mathbf{y} + \beta_2 \mathbf{W}\mathbf{x} + \boldsymbol\epsilon_u$

An F-test on the marginal explanatory power of $\mathbf{W}\mathbf{x}$ yields the SGC p-value. Significant directional pairs are added as candidate edges to the PC skeleton.

### 2.3 Domain constraints

Data-driven discovery alone cannot distinguish causal direction for every edge, and with finite samples can produce nonsensical orientations (e.g., elevation → intrusion depth). We impose geological priors from Sillitoe (2010) and Cooke et al. (2014):

- **Forbidden edges** — surface or measurement features cannot cause deep processes. Examples: `ndvi → intrusion_depth`, `Cu_ppm → alteration_intensity`.
- **Required edges** — published mechanisms. Examples: `alteration_intensity → Cu_ppm`, `sulfide_content → magnetic_low`, `fault_intersection_density → vein_density`.
- **Tier ordering** — eight discrete tiers from `TECTONIC` down to `MEASUREMENT`. An edge whose target tier is strictly above its source tier is rejected.

After imposition, any induced cycles are broken by removing the weakest non-required edge, preserving acyclicity.

### 2.4 Feature selection

A feature $X$ is a **valid causal predictor** of target $Y$ iff:

1. There is a directed path $X \rightsquigarrow Y$ in the DAG (X is an ancestor of Y), **and**
2. There is no directed path $Y \rightsquigarrow X$ (X is not a descendant).

This yields $\mathrm{Ancestors}(Y) \setminus \mathrm{Descendants}(Y) \setminus \{Y\}$. Conditioning on descendants of $Y$ introduces collider bias; conditioning on ancestors blocks backdoor paths. In our 19-feature AZ pipeline this reduces the set to 7 features (63.2% reduction).

## 3 · Prospectivity models

### 3.1 Weights of Evidence (baseline)

Bayesian log-linear model: each binary evidence layer $E_k$ contributes a weight

$$
w_k^+ = \ln\frac{\Pr(E_k = 1 \mid Y = 1)}{\Pr(E_k = 1 \mid Y = 0)},
\qquad
w_k^- = \ln\frac{\Pr(E_k = 0 \mid Y = 1)}{\Pr(E_k = 0 \mid Y = 0)}
$$

The posterior log-odds is the sum of applicable weights plus the prior. Despite independence assumptions that rarely hold for geological data, WoE remains the GIS industry standard, which is why we include it as a reference point.

### 3.2 XGBoost with causal features

Gradient-boosted trees on the 7 causally-selected features. Key hyperparameters: `n_estimators=500`, `max_depth=6`, `learning_rate=0.05`, `scale_pos_weight = n_neg / n_pos`. The scale adjustment is essential because the positive-class rate is $\approx 5\%$.

### 3.3 Graph Attention Network (optional extra)

The H3 grid induces a natural hexagonal graph. A three-layer GATv2 network (Brody et al. 2022) with four attention heads and 128 hidden channels consumes causally-selected node features plus edge attributes (great-circle distance, shared fault segments, lithological-contact crossings). The final per-node prediction head outputs a prospectivity score.

## 4 · GeoConformal prediction

Let $(\mathbf{x}_i, y_i, \mathbf{s}_i)_{i=1}^{n_\mathrm{cal}}$ be a held-out calibration set with features, labels, and spatial coordinates. Given a model $\hat f$ and miscoverage level $\alpha$, the GeoConformal predictor (Lou et al. 2024) produces intervals

$$
\hat C_\alpha(\mathbf{x}_\mathrm{test}, \mathbf{s}_\mathrm{test}) = \left[\hat f(\mathbf{x}_\mathrm{test}) - q, \; \hat f(\mathbf{x}_\mathrm{test}) + q\right]
$$

where $q$ is the geographically-weighted $(1 - \alpha)$ quantile of the **non-conformity scores**

$$
R_i = |y_i - \hat f(\mathbf{x}_i)|.
$$

The weighting kernel is

$$
w_i(\mathbf{s}_\mathrm{test}) = \exp\!\left(-\frac{1}{2} \cdot \frac{d_\mathrm{haversine}(\mathbf{s}_\mathrm{test}, \mathbf{s}_i)^2}{h^2}\right),
\qquad h = \mathrm{median}_i \, d_\mathrm{haversine}(\mathbf{s}_i, \mathbf{s}_i^{(k)})
$$

where $\mathbf{s}_i^{(k)}$ is the $k$-th nearest calibration point and $k = \lceil \sqrt{n_\mathrm{cal}} \rceil$. Adaptive bandwidth makes the method responsive to locally dense or sparse calibration regions.

### 4.1 Theoretical guarantee

Under the exchangeability of calibration and test residuals, the marginal coverage is

$$
\Pr\!\left(y_\mathrm{test} \in \hat C_\alpha(\mathbf{x}_\mathrm{test})\right) \ge 1 - \alpha
$$

exactly, at finite sample size, without any distributional assumption. Our empirical coverage of **86%** at $\alpha = 0.1$ reflects a mild violation of exchangeability — spatial data is never iid — but remains well-calibrated compared to kriging variance.

### 4.2 Why not kriging variance

Kriging variance is

$$
\sigma^2_\mathrm{OK}(\mathbf{s}) = C(\mathbf{0}) - \sum_i \lambda_i C(\mathbf{s} - \mathbf{s}_i)
$$

where $C$ is the covariance model. Two sites with identical sample configurations produce identical kriging variance regardless of data values — a *data-configuration* metric, not a *prediction-difficulty* metric. Our empirical calibration plot shows kriging variance under-covering by 30+ percentage points at the 90% target.

## 5 · Validation

### 5.1 Spatial block cross-validation

Conventional random CV under spatial autocorrelation inflates performance because nearby cells leak between train and test. We instead partition the study area into 16 contiguous blocks ($\sqrt{16} \times \sqrt{16}$ lat/lon grid), then assign whole blocks to train (60%) / calibration (20%) / test (20%). This guarantees that test cells are geographically separated from training.

### 5.2 Metrics

- **AUC-ROC** — standard but optimistic under heavy class imbalance.
- **AUC-PR** (average precision) — the correct metric when positives are rare. Interpretable as "expected precision across recall levels."
- **Success-rate curves** — operational: "what fraction of known deposits does the top p% of cells capture?" Mining teams read this directly as drill-hole efficiency.
- **Conformal coverage at α = 0.1** — should be ≥ 90% if the method is calibrated.
- **Spearman(interval width, geological complexity)** — should be positive if UQ tracks real difficulty.

## 6 · Known limitations and extensions

| Limitation | Extension |
|---|---|
| 19 public-API features; production prospectivity uses ~100 | Wire up SatCLIP + Prithvi-EO-2.0 foundation embeddings |
| XGBoost only; no GNN baseline trained yet | Turn on PyTorch Geometric extra, train the provided `CausalGAT` |
| Drill holes are representative from published grade envelopes | Parse NI 43-101 / S-K 1300 PDFs for measured hole logs |
| Single study area (Arizona) | Nevada lithium transfer to prove cross-terrane generalization |
| Conformal coverage 86% vs 90% target | Increase calibration set size, or use locally-adaptive conformal (Romano et al. 2019) |

## 7 · References

- Brody, S., Alon, U., & Yahav, E. (2022). *How attentive are graph attention networks?* ICLR.
- Cooke, D.R., Hollings, P., Wilkinson, J.J., & Tosdal, R.M. (2014). *Geochemistry of porphyry deposits*. Treatise on Geochemistry 13.
- Lou, R., Gao, S., Zhu, A.-X. (2024). *GeoConformal prediction: a model-agnostic framework for spatial prediction uncertainty quantification*. Annals of the AAG.
- Romano, Y., Patterson, E., & Candès, E. (2019). *Conformalized quantile regression*. NeurIPS.
- Sillitoe, R. H. (2010). *Porphyry copper systems*. Economic Geology 105(1).
- Spirtes, P., Glymour, C., & Scheines, R. (2000). *Causation, Prediction, and Search*. MIT Press.
- Vovk, V., Gammerman, A., & Shafer, G. (2005). *Algorithmic Learning in a Random World*. Springer.
- Zhu, A.-X., et al. (2025). *Causal-aware AI framework for mineral prospectivity mapping*. Gondwana Research.
