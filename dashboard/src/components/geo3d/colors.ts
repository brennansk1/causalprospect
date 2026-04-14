import * as THREE from 'three'

const PROSPECTIVITY_RAMP = ['#1e3a8a', '#0891b2', '#eab308', '#f97316', '#dc2626']
const STRAT = [
  '#c4a26e', // alluvium
  '#8a9560', // tertiary
  '#9caf88', // cretaceous
  '#b85c3a', // laramide
  '#6ba0b8', // paleozoic
  '#5a4f6c', // basement
]

export function stratColor(depthFrac: number): THREE.Color {
  const breaks = [0.08, 0.18, 0.32, 0.5, 0.72, 1.01]
  for (let i = 0; i < breaks.length; i++) {
    if (depthFrac <= breaks[i]) return new THREE.Color(STRAT[i])
  }
  return new THREE.Color(STRAT[STRAT.length - 1])
}

export function prospectivityColor(p: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, p))
  const scaled = clamped * (PROSPECTIVITY_RAMP.length - 1)
  const i = Math.floor(scaled)
  const t = scaled - i
  const a = new THREE.Color(PROSPECTIVITY_RAMP[i])
  const b = new THREE.Color(PROSPECTIVITY_RAMP[Math.min(i + 1, PROSPECTIVITY_RAMP.length - 1)])
  return a.lerp(b, t)
}

export function gradeColor(cuPct: number): THREE.Color {
  if (cuPct < 0.02) return new THREE.Color('#94a3b8')
  if (cuPct < 0.1) return new THREE.Color('#38a169')
  if (cuPct < 0.3) return new THREE.Color('#ca8a04')
  if (cuPct < 0.6) return new THREE.Color('#dd6b20')
  if (cuPct < 1.0) return new THREE.Color('#c53030')
  return new THREE.Color('#7c2d12')
}

export function terrainColor(elevFrac: number): THREE.Color {
  // desert basin (tan) → mid (olive) → high (muted lavender, snow hint)
  const stops = [
    [0.0, new THREE.Color('#c6a97b')],
    [0.35, new THREE.Color('#a8955c')],
    [0.6, new THREE.Color('#7a8c5a')],
    [0.85, new THREE.Color('#9a9eac')],
    [1.0, new THREE.Color('#e6e3e0')],
  ] as const
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (elevFrac <= t1) {
      const t = (elevFrac - t0) / Math.max(1e-6, t1 - t0)
      return c0.clone().lerp(c1, t)
    }
  }
  return new THREE.Color('#e6e3e0')
}
