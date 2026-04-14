import { useMemo } from 'react'
import type { UncertaintyPayload } from '../../types'

export function UncertaintyMaps({ data }: { data: UncertaintyPayload | null }) {
  if (!data) {
    return <div className="skeleton" style={{ width: '100%', height: '100%', minHeight: 160, borderRadius: 6 }} />
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        height: '100%',
        minHeight: 0,
      }}
    >
      <MapCard
        title="GeoConformal interval width"
        caption="Wider where geology is complex (fault clusters, deposit belts) — the UQ tracks real difficulty"
        grid={data.width_grid.geoconformal}
        w={data.width_grid.width}
        h={data.width_grid.height}
        ramp={['#e6f5f2', '#a0d2c8', '#4fa99b', '#2a9d8f', '#166b61']}
      />
      <MapCard
        title="Kriging variance"
        caption="Approximately uniform — dominated by data density, not geological complexity"
        grid={data.width_grid.kriging}
        w={data.width_grid.width}
        h={data.width_grid.height}
        ramp={['#faeccc', '#f0c878', '#e0a030', '#b87816', '#7a5010']}
      />
    </div>
  )
}

function MapCard({
  title,
  caption,
  grid,
  w,
  h,
  ramp,
}: {
  title: string
  caption: string
  grid: number[]
  w: number
  h: number
  ramp: string[]
}) {
  const { cells, vmin, vmax } = useMemo(() => {
    const vmin = Math.min(...grid)
    const vmax = Math.max(...grid)
    return { cells: grid, vmin, vmax }
  }, [grid])

  const color = (v: number) => {
    const t = Math.max(0, Math.min(1, (v - vmin) / Math.max(1e-9, vmax - vmin)))
    const idx = t * (ramp.length - 1)
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, ramp.length - 1)
    return ramp[Math.round(lo + (idx - lo) * (hi - lo))]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{title}</div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', borderRadius: 4, border: '1px solid var(--border)' }}>
        {Array.from({ length: h }).map((_, y) =>
          Array.from({ length: w }).map((_, x) => (
            <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={color(cells[y * w + x] ?? 0)} />
          )),
        )}
      </svg>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{caption}</div>
    </div>
  )
}
