// Shared type contracts with the FastAPI backend.

export type TabId = 'geo3d' | 'causal' | 'benchmark' | 'uncertainty'

export interface Deposit {
  id: string
  name: string
  owner: string
  lat: number
  lon: number
  grade_pct: number
  tonnage_mt: number
  deposit_type: string
  status: string
  size_class: 'small' | 'medium' | 'large' | 'giant'
  prospectivity?: number
  conformal_lower?: number
  conformal_upper?: number
}

export interface DrillInterval {
  from_m: number
  to_m: number
  cu_pct: number
}

export interface MrdsOccurrence {
  id: string
  name: string
  status: string
  commodities: string
  lat: number
  lon: number
}

export interface DrillHole {
  id: string
  deposit_id: string
  lat: number
  lon: number
  azimuth_deg: number
  dip_deg: number
  total_depth_m: number
  collar_elevation_m: number
  intervals: DrillInterval[]
}

export interface TerrainPayload {
  bbox: [number, number, number, number] // minLon, minLat, maxLon, maxLat
  width: number
  height: number
  elevation_m: number[] // row-major, width*height
  min_elevation_m: number
  max_elevation_m: number
}

export interface ProspectivityCell {
  cell: string
  lat: number
  lon: number
  prospectivity: number
  deposit_present: number
}

export interface KPIData {
  study_area_km2: number
  grid_cells: number
  known_deposits: number
  causal_features: number
  total_features: number
  best_auc_pr: number
  conformal_coverage: number
  drill_holes?: number
}

export interface DAGNode {
  id: string
  tier: string
  label: string
  kind: 'feature' | 'target' | 'latent'
  selected?: boolean
  excluded?: boolean
  reason?: string
}

export interface DAGEdge {
  source: string
  target: string
  weight: number // 0..1
  method: 'pc' | 'sgc' | 'domain'
  required?: boolean
}

export interface DAGPayload {
  nodes: DAGNode[]
  edges: DAGEdge[]
  selection: {
    parents: string[]
    ancestors: string[]
    colliders_excluded: string[]
    adjustment_set: string[]
    causal_features: string[]
    reduction_pct: number
    auc_pr_improvement: number
  }
}

export interface ModelResult {
  name: string
  auc_roc: number
  auc_pr: number
  features: number
  uq: string
  is_champion?: boolean
}

export interface SuccessRatePoint {
  area_examined: number
  deposits_found: number
}

export interface BenchmarkPayload {
  models: ModelResult[]
  success_rate_curves: Record<string, SuccessRatePoint[]>
}

export interface CalibrationPoint {
  target: number
  geoconformal: number
  kriging: number
}

export interface UncertaintyPayload {
  calibration: CalibrationPoint[]
  geoconformal_coverage: number
  kriging_coverage: number
  width_grid: {
    width: number
    height: number
    geoconformal: number[]
    kriging: number[]
    bbox: [number, number, number, number]
  }
}
