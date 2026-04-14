import type { UncertaintyPayload } from '../../types'

export function MethodologyCompare({ data }: { data: UncertaintyPayload | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Kriging variance</strong> depends only on
        the spatial configuration of data points — two regions with identical sampling density
        produce identical uncertainty, regardless of geological complexity.{' '}
        <strong style={{ color: 'var(--text-primary)' }}>GeoConformal prediction</strong> uses a
        held-out calibration set to derive distribution-free, finite-sample coverage guarantees
        that adapt to local prediction difficulty.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        <MethodCard
          label="Kriging variance"
          value={data ? (data.kriging_coverage * 100).toFixed(1) + '%' : '—'}
          accent="var(--data-gold)"
          note="under-covers in complex terrain"
        />
        <MethodCard
          label="GeoConformal"
          value={data ? (data.geoconformal_coverage * 100).toFixed(1) + '%' : '—'}
          accent="var(--data-teal)"
          note="target 90% at α=0.1"
        />
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        <li><strong>Distribution-free:</strong> no assumption about data distribution</li>
        <li><strong>Model-agnostic:</strong> wraps any predict_proba model without retraining</li>
        <li><strong>Geographically weighted:</strong> kernel on calibration residuals adapts to each test point</li>
        <li><strong>Finite-sample:</strong> guarantees hold at any sample size, not just asymptotically</li>
      </ul>
    </div>
  )
}

function MethodCard({
  label,
  value,
  accent,
  note,
}: {
  label: string
  value: string
  accent: string
  note: string
}) {
  return (
    <div
      style={{
        border: `1px solid ${accent}55`,
        borderLeft: `3px solid ${accent}`,
        background: `${accent}0d`,
        borderRadius: 6,
        padding: '10px 12px',
      }}
    >
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: 0.7, color: accent, textTransform: 'uppercase' }}
      >
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{note}</div>
    </div>
  )
}
