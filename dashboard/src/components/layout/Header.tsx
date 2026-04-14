import type { TabId } from '../../types'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'geo3d', label: '3D Geological Model', icon: '◆' },
  { id: 'causal', label: 'Causal DAG', icon: '◇' },
  { id: 'benchmark', label: 'Model Benchmark', icon: '▣' },
  { id: 'uncertainty', label: 'Uncertainty QC', icon: '◈' },
]

export function Header({
  tab,
  onTabChange,
}: {
  tab: TabId
  onTabChange: (t: TabId) => void
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '10px 20px',
        background: '#fff',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-e1)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 260 }}>
        <Logo />
        <div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, fontWeight: 600, lineHeight: 1 }}>
            CausalProspect
          </div>
          <div
            className="mono"
            style={{ fontSize: 10, letterSpacing: 0.8, color: 'var(--text-muted)', textTransform: 'uppercase' }}
          >
            causal · conformal · copper
          </div>
        </div>
      </div>

      <nav
        role="tablist"
        style={{
          display: 'flex',
          gap: 2,
          background: 'var(--bg-app)',
          padding: 3,
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        {TABS.map((t) => {
          const active = t.id === tab
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 14px',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                color: active ? '#fff' : 'var(--text-secondary)',
                background: active ? 'var(--brand)' : 'transparent',
                border: 'none',
                borderRadius: 5,
                cursor: 'pointer',
                transition: 'background 120ms, color 120ms',
              }}
            >
              <span style={{ opacity: active ? 1 : 0.7 }}>{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </nav>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
        <StudyAreaBadge />
        <AuthorBadge />
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="cp-logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0176d3" />
          <stop offset="1" stopColor="#014486" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#cp-logo-g)" />
      <path d="M7 22 L16 7 L25 22 Z" fill="#fff" opacity="0.15" />
      <circle cx="16" cy="18" r="3.4" fill="#d45d2a" />
      <circle cx="16" cy="18" r="6" fill="none" stroke="#d45d2a" strokeOpacity="0.6" strokeWidth="1" />
    </svg>
  )
}

function StudyAreaBadge() {
  return (
    <div
      className="mono"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 11,
        color: 'var(--text-secondary)',
        padding: '6px 10px',
        border: '1px solid var(--border)',
        borderRadius: 20,
        background: 'var(--bg-subtle)',
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2e844a' }} />
      Arizona Porphyry Belt · 31°–34.5°N · 109°–113°W
    </div>
  )
}

function AuthorBadge() {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.35 }}>
      <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Brennan Skanski</div>
      <div>v0.1 · April 2026</div>
    </div>
  )
}
