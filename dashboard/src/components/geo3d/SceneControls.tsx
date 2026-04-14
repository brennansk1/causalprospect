import type { SceneSettings } from './Geo3DTab'

interface Props {
  settings: SceneSettings
  onChange: (s: SceneSettings) => void
}

const MAP_LEGEND = [
  { name: 'Mexico (Sonora) border', color: '#c0392b', style: 'dashed' },
  { name: 'State border', color: '#444444', style: 'dashed' },
  { name: 'Interstate / US highway', color: '#f5d76e', style: 'solid' },
  { name: 'Major river', color: '#4a8fb5', style: 'solid' },
  { name: 'Elevation contour (250 m)', color: '#5a3a1e', style: 'solid' },
  { name: 'Index contour (1000 m)', color: '#4a2a10', style: 'solid' },
  { name: 'Graticule (1° grid)', color: '#cccccc', style: 'solid' },
]

const ELEV_LEGEND = [
  { name: 'Desert basin (< 400 m)', color: '#cbb489' },
  { name: 'Sonoran desert plains', color: '#baa375' },
  { name: 'Mid elevation (1000–1800 m)', color: '#8e995b' },
  { name: 'Upland range', color: '#6a7840' },
  { name: 'Sky-island uplift (> 2400 m)', color: '#8a6e45' },
  { name: 'High peaks (> 3000 m)', color: '#a48558' },
]

const GRADE_LEGEND = [
  { range: '< 0.02%', color: '#94a3b8', label: 'Barren' },
  { range: '0.02–0.1%', color: '#38a169', label: 'Low' },
  { range: '0.1–0.3%', color: '#ca8a04', label: 'Moderate' },
  { range: '0.3–0.6%', color: '#dd6b20', label: 'Economic' },
  { range: '0.6–1.0%', color: '#c53030', label: 'High' },
  { range: '> 1.0%', color: '#7c2d12', label: 'Bonanza' },
]

export function SceneControls({ settings, onChange }: Props) {
  const set = (patch: Partial<SceneSettings>) => onChange({ ...settings, ...patch })

  return (
    <aside
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-e1)',
        padding: 14,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <Section title="Scene layers">
        <Toggle label="Topographic relief" on={settings.showTerrain} onChange={(v) => set({ showTerrain: v })} />
        <Toggle
          label="Elevation contours"
          on={settings.showContours}
          onChange={(v) => set({ showContours: v })}
        />
        <Toggle
          label="Prospectivity overlay"
          on={settings.showProspectivity}
          onChange={(v) => set({ showProspectivity: v })}
          accent="var(--data-copper)"
        />
        <Toggle
          label="Mineral occurrences (8.5k)"
          on={settings.showOccurrences}
          onChange={(v) => set({ showOccurrences: v })}
          accent="var(--data-copper)"
        />
        <Toggle label="Drill holes" on={settings.showDrillHoles} onChange={(v) => set({ showDrillHoles: v })} />
        <Toggle label="Deposit labels" on={settings.showLabels} onChange={(v) => set({ showLabels: v })} />
        <Toggle
          label="Auto-rotate"
          on={settings.autoRotate}
          onChange={(v) => set({ autoRotate: v })}
          accent="var(--brand)"
        />
      </Section>

      <Section title="Commodity (occurrences)">
        <LegendRow color="#d45d2a" label="Cu · copper" />
        <LegendRow color="#e0a030" label="Au · gold" />
        <LegendRow color="#c0c0c0" label="Ag · silver" />
        <LegendRow color="#8a7046" label="Mo · molybdenum" />
        <LegendRow color="#5aa0aa" label="Ni · nickel" />
        <LegendRow color="#5a8f6a" label="U · uranium" />
        <LegendRow color="#6c7b9a" label="other / multi" />
      </Section>

      <Section title="Map reference">
        {MAP_LEGEND.map((l) => (
          <LegendRow key={l.name} color={l.color} label={l.name} dashed={l.style === 'dashed'} />
        ))}
      </Section>

      <Section title="Elevation (NASADEM)">
        {ELEV_LEGEND.map((l) => (
          <LegendRow key={l.name} color={l.color} label={l.name} />
        ))}
      </Section>

      <Section title="Cu grade (drill intervals)">
        {GRADE_LEGEND.map((l) => (
          <LegendRow
            key={l.range}
            color={l.color}
            label={
              <span>
                <span style={{ color: 'var(--text-primary)' }}>{l.range}</span>{' '}
                <span style={{ color: 'var(--text-muted)' }}>· {l.label}</span>
              </span>
            }
          />
        ))}
      </Section>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 0.8,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingBottom: 6,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function Toggle({
  label,
  on,
  onChange,
  accent = 'var(--data-teal)',
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  accent?: string
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 8px',
        border: '1px solid var(--border)',
        borderRadius: 5,
        background: on ? 'var(--bg-selected)' : '#fff',
        color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: 12,
        textAlign: 'left',
        transition: 'background 120ms',
      }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          borderRadius: 3,
          border: `1.5px solid ${on ? accent : 'var(--border-strong)'}`,
          background: on ? accent : 'transparent',
        }}
      />
      {label}
    </button>
  )
}

function LegendRow({
  color,
  label,
  dashed,
}: {
  color: string
  label: React.ReactNode
  dashed?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
      <span
        style={{
          width: 14,
          height: dashed ? 0 : 10,
          borderRadius: 2,
          background: dashed ? 'transparent' : color,
          borderTop: dashed ? `2px dashed ${color}` : undefined,
          flexShrink: 0,
        }}
      />
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}
