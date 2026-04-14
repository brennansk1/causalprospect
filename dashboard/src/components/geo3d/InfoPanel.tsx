import { useState } from 'react'

/** Floating "What am I looking at?" panel for recruiters. Collapsible so it
 *  stays out of the way once read. */
export function InfoPanel() {
  // Collapsed by default so the topography isn't obscured; recruiter opens
  // it the moment they want an explanation.
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 84,
        maxWidth: open ? 340 : 120,
        background: 'rgba(255,255,255,0.96)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: 'var(--shadow-e2)',
        overflow: 'hidden',
        transition: 'max-width 180ms ease',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '6px 10px',
          background: open ? 'var(--bg-subtle)' : '#fff',
          border: 'none',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          fontFamily: 'JetBrains Mono, monospace',
          cursor: 'pointer',
        }}
        aria-expanded={open}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--brand)',
              color: '#fff',
              textAlign: 'center',
              lineHeight: '18px',
              fontSize: 11,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            i
          </span>
          <span>{open ? 'About this view' : 'How to read'}</span>
        </span>
        {open && <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>}
      </button>
      {open && (
        <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: 'var(--text-primary)' }}>What you&apos;re seeing:</strong>{' '}
            the Arizona Laramide porphyry copper belt, rendered from real NASADEM
            elevation (33 m desert basin → 3,200 m Sky Island peaks) with 5× vertical
            exaggeration to make relief readable at this zoom.
          </p>
          <Legend
            rows={[
              { dot: '#d45d2a', label: 'Porphyry copper deposits — 11 from live USGS MRDS, pulsing ring + floating beacon' },
              { dot: '#c53030', label: 'Drill holes — representative pattern (collar + color-coded Cu intervals), select a deposit to see detail' },
              { dot: '#1a0f04', label: 'Elevation contours — 250 m intervals, bold + labeled every 1000 m' },
              { dot: '#c0392b', label: 'AZ-Mexico border (Sonora)' },
              { dot: '#444', label: 'AZ state boundaries' },
              { dot: '#f5d76e', label: 'Interstate highways (I-10, I-17, I-8, I-19, US-60)' },
              { dot: '#4a8fb5', label: 'Major rivers (Gila, Salt, Colorado)' },
              { dot: '#000', label: 'Reference cities for geographic orientation' },
            ]}
          />
          <p style={{ margin: '10px 0 0' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Toggle</strong>{' '}
            <em>Prospectivity overlay</em> in the left panel to colorize the
            terrain by the causal-XGBoost + GeoConformal prediction instead
            of by elevation. Click any deposit marker for its grade,
            tonnage, owner, and calibrated prospectivity interval.
          </p>
        </div>
      )}
    </div>
  )
}

function Legend({ rows }: { rows: { dot: string; label: string }[] }) {
  return (
    <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
      {rows.map((r) => (
        <li key={r.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span
            style={{
              flexShrink: 0,
              width: 9,
              height: 9,
              borderRadius: 2,
              background: r.dot,
              marginTop: 4,
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          />
          <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{r.label}</span>
        </li>
      ))}
    </ul>
  )
}
