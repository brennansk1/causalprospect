import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

interface KPICardProps {
  label: string
  value: string
  subtitle: string
  accent?: string
}

function KPICard({ label, value, subtitle, accent = 'var(--data-copper)' }: KPICardProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 140,
        padding: '10px 14px',
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-e1)',
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 0.7,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.2, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 11, color: accent, marginTop: 3, fontWeight: 500 }}>{subtitle}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div
      className="skeleton"
      style={{ flex: 1, minWidth: 140, height: 62, borderRadius: 6, border: '1px solid var(--border)' }}
    />
  )
}

export function KPIStrip() {
  const { data, isLoading } = useQuery({ queryKey: ['kpis'], queryFn: api.kpis })

  const fmt = {
    area: (v?: number) => (v ? `~${Math.round(v / 1000)}K km²` : '—'),
    cells: (v?: number) => (v ? v.toLocaleString() : '—'),
    pct: (v?: number) => (v !== undefined ? `${(v * 100).toFixed(1)}%` : '—'),
    num: (v?: number) => (v !== undefined ? v.toString() : '—'),
    fixed: (v?: number, d = 3) => (v !== undefined ? v.toFixed(d) : '—'),
  }

  const reduction =
    data?.total_features && data?.causal_features
      ? `${Math.round((1 - data.causal_features / data.total_features) * 100)}% noise removed`
      : '—'

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        padding: '10px 20px',
        background: 'var(--bg-app)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {isLoading ? (
        Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} />)
      ) : (
        <>
          <KPICard label="Study Area" value={fmt.area(data?.study_area_km2)} subtitle="Laramide Province" />
          <KPICard
            label="Grid Cells"
            value={fmt.cells(data?.grid_cells)}
            subtitle="H3 Resolution 7"
            accent="var(--brand)"
          />
          <KPICard
            label="Known Deposits"
            value={fmt.num(data?.known_deposits)}
            subtitle="USGS MRDS + AZGS"
            accent="var(--data-danger)"
          />
          <KPICard
            label="Drill Holes"
            value={fmt.num(data?.drill_holes ?? 0)}
            subtitle="Public NI 43-101"
            accent="var(--data-gold)"
          />
          <KPICard
            label="Causal Features"
            value={`${fmt.num(data?.causal_features)} / ${fmt.num(data?.total_features)}`}
            subtitle={reduction}
            accent="var(--data-teal)"
          />
          <KPICard
            label="Best AUC-PR"
            value={fmt.fixed(data?.best_auc_pr, 3)}
            subtitle="XGB · Causal · GeoConf"
            accent="var(--data-copper)"
          />
          <KPICard
            label="Conformal Coverage"
            value={fmt.pct(data?.conformal_coverage)}
            subtitle="Target 90% · α=0.1"
            accent="var(--data-success)"
          />
        </>
      )}
    </div>
  )
}
