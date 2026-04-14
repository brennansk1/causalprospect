import type { DrillInterval } from '../../types'

function cssGradeColor(cu: number): string {
  if (cu < 0.02) return '#94a3b8'
  if (cu < 0.1) return '#38a169'
  if (cu < 0.3) return '#ca8a04'
  if (cu < 0.6) return '#dd6b20'
  if (cu < 1.0) return '#c53030'
  return '#7c2d12'
}

export function GradeBar({ intervals }: { intervals: DrillInterval[] }) {
  const total = intervals.length ? intervals[intervals.length - 1].to_m : 0
  return (
    <div
      style={{
        display: 'flex',
        height: 10,
        borderRadius: 2,
        overflow: 'hidden',
        marginTop: 6,
        border: '1px solid var(--border)',
      }}
      title={`${intervals.length} intervals · ${total.toFixed(0)} m`}
    >
      {intervals.map((iv, i) => (
        <div
          key={i}
          style={{
            flex: iv.to_m - iv.from_m,
            background: cssGradeColor(iv.cu_pct),
          }}
        />
      ))}
    </div>
  )
}
