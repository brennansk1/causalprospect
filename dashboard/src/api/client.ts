// API client — points to FastAPI in dev, falls back to static JSON bundled
// under /public/data if the backend isn't running (so the dashboard still
// renders the latest pipeline output when deployed statically).

import type {
  BenchmarkPayload,
  DAGPayload,
  Deposit,
  DrillHole,
  KPIData,
  MrdsOccurrence,
  ProspectivityCell,
  TerrainPayload,
  UncertaintyPayload,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const STATIC_BASE = '/data'

async function fetchJson<T>(name: string): Promise<T> {
  const live = `${API_BASE}/api/${name}`
  const fallback = `${STATIC_BASE}/${name}.json`
  try {
    const r = await fetch(live, { signal: AbortSignal.timeout(1500) })
    if (r.ok) return (await r.json()) as T
  } catch {
    // fall through to static
  }
  const r = await fetch(fallback)
  if (!r.ok) throw new Error(`Could not load ${name} from API or static`)
  return (await r.json()) as T
}

export const api = {
  kpis: () => fetchJson<KPIData>('kpis'),
  deposits: () => fetchJson<Deposit[]>('deposits'),
  drillHoles: () => fetchJson<DrillHole[]>('drill_holes'),
  terrain: () => fetchJson<TerrainPayload>('terrain'),
  prospectivityGrid: () => fetchJson<ProspectivityCell[]>('prospectivity_grid'),
  causalDag: () => fetchJson<DAGPayload>('causal_dag'),
  benchmark: () => fetchJson<BenchmarkPayload>('benchmark'),
  uncertainty: () => fetchJson<UncertaintyPayload>('uncertainty'),
  mrdsOccurrences: () => fetchJson<MrdsOccurrence[]>('mrds_occurrences'),
}
