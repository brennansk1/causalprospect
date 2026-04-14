import type { Deposit, DrillHole } from '../../types'
import { GradeBar } from './GradeBar'

export function DepositInspector({
  deposits,
  drillHoles,
  selected,
  onSelect,
}: {
  deposits: Deposit[]
  drillHoles: DrillHole[]
  selected: Deposit | null
  onSelect: (id: string) => void
}) {
  return (
    <aside
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-e1)',
        overflow: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {selected ? (
        <SelectedView deposit={selected} drillHoles={drillHoles} />
      ) : (
        <EmptyState deposits={deposits} onSelect={onSelect} />
      )}
    </aside>
  )
}

function EmptyState({ deposits, onSelect }: { deposits: Deposit[]; onSelect: (id: string) => void }) {
  return (
    <>
      <SectionHeader>Deposit catalog</SectionHeader>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 6 }}>
        Click a marker in the scene, or select below to inspect.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {deposits.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 10px',
              border: '1px solid var(--border)',
              borderRadius: 5,
              background: '#fff',
              textAlign: 'left',
              fontSize: 12,
              color: 'var(--text-primary)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.owner}</div>
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--data-copper)' }}
            >
              {d.grade_pct.toFixed(2)}%
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function SelectedView({ deposit, drillHoles }: { deposit: Deposit; drillHoles: DrillHole[] }) {
  return (
    <>
      <div>
        <div
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: -0.3,
            lineHeight: 1.1,
          }}
        >
          {deposit.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--data-copper)', fontWeight: 600, marginTop: 2 }}>
          {deposit.owner}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Metric label="Grade" value={`${deposit.grade_pct.toFixed(2)}% Cu`} />
        <Metric label="Tonnage" value={`${deposit.tonnage_mt.toLocaleString()} Mt`} />
        <Metric label="Type" value={deposit.deposit_type} />
        <Metric label="Status" value={deposit.status} />
      </div>

      {deposit.prospectivity !== undefined && (
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 12,
            background: 'var(--bg-subtle)',
          }}
        >
          <SectionHeader>Model prediction</SectionHeader>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--data-copper)' }}>
              {(deposit.prospectivity * 100).toFixed(1)}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ 100 prospectivity</span>
          </div>
          {deposit.conformal_lower !== undefined && deposit.conformal_upper !== undefined && (
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}
            >
              GeoConformal 90%: [{(deposit.conformal_lower * 100).toFixed(1)},{' '}
              {(deposit.conformal_upper * 100).toFixed(1)}]
            </div>
          )}
          <div
            style={{
              marginTop: 10,
              height: 6,
              background: '#e7eaee',
              borderRadius: 3,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${(deposit.conformal_lower ?? deposit.prospectivity) * 100}%`,
                right: `${100 - (deposit.conformal_upper ?? deposit.prospectivity) * 100}%`,
                top: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, #2a9d8f, #d45d2a)',
                opacity: 0.35,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: `${deposit.prospectivity * 100}%`,
                top: -2,
                width: 2,
                height: 10,
                background: 'var(--data-copper)',
              }}
            />
          </div>
        </div>
      )}

      <div>
        <SectionHeader>Drill holes ({drillHoles.length})</SectionHeader>
        {drillHoles.length > 0 && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              fontStyle: 'italic',
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            Representative pattern generated from the deposit&apos;s published
            headline grade + size class (Sillitoe 2010 porphyry envelope).
            Real NI 43-101 / S-K 1300 hole logs are PDF-only and not
            API-accessible.
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {drillHoles.slice(0, 5).map((h) => (
            <DrillHoleCard key={h.id} hole={h} />
          ))}
          {drillHoles.length > 5 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              +{drillHoles.length - 5} more holes in full catalog
            </div>
          )}
          {drillHoles.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              No public drill-hole data cached for this deposit.
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 5,
        padding: '7px 9px',
        background: '#fff',
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

function DrillHoleCard({ hole }: { hole: DrillHole }) {
  const maxCu = Math.max(0, ...hole.intervals.map((i) => i.cu_pct))
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 5, padding: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
          {hole.id}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--data-copper)' }}>
          max {maxCu.toFixed(2)}% Cu
        </span>
      </div>
      <GradeBar intervals={hole.intervals} />
      <div
        className="mono"
        style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, letterSpacing: 0.3 }}
      >
        {hole.total_depth_m.toFixed(0)} m · az {hole.azimuth_deg.toFixed(0)}° · dip {hole.dip_deg.toFixed(0)}°
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mono"
      style={{
        fontSize: 10,
        letterSpacing: 0.8,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        paddingBottom: 4,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}
