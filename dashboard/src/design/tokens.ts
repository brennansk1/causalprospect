// Salesforce Lightning-inspired design tokens. Light enterprise palette;
// geoscience data colors (copper/teal/gold) reserved for data encoding only.

export const color = {
  // Surfaces
  bgApp: '#f3f3f3',
  bgSurface: '#ffffff',
  bgSubtle: '#f7f9fb',
  bgHover: '#f3f5f8',
  bgSelected: '#eef4fb',

  // Borders
  border: '#e5e5e5',
  borderStrong: '#c9c9c9',
  borderFocus: '#1b96ff',

  // Text
  textPrimary: '#181818',
  textSecondary: '#444444',
  textMuted: '#706e6b',
  textInverse: '#ffffff',

  // Brand (Salesforce blue spectrum)
  brand: '#0176d3',
  brandHover: '#014486',
  brandSubtle: '#eef4fb',

  // Data encoding (kept from geological palette — these are colors mining
  // geologists expect on maps, so we keep them and only change the chrome).
  dataCopper: '#d45d2a',
  dataTeal: '#2a9d8f',
  dataGold: '#e0a030',
  dataDanger: '#ea001e',
  dataSuccess: '#2e844a',

  // Grade color ramp for drill hole intervals.
  grade: {
    barren: '#94a3b8',
    low: '#38a169',
    moderate: '#ca8a04',
    economic: '#dd6b20',
    high: '#c53030',
    bonanza: '#7c2d12',
  },

  // Stratigraphy palette (subsurface geology cutaway).
  strat: {
    alluvium: '#c4a26e',
    tertiary: '#8a9560',
    cretaceous: '#9caf88',
    laramide: '#b85c3a',
    paleozoic: '#6ba0b8',
    basement: '#5a4f6c',
  },

  // Prospectivity ramp (blue -> teal -> yellow -> orange -> red).
  prospectivity: ['#1e3a8a', '#0891b2', '#eab308', '#f97316', '#dc2626'],
} as const

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  pill: 999,
} as const

export const shadow = {
  // SLDS elevation tokens.
  e1: '0 1px 2px rgba(0, 0, 0, 0.05)',
  e2: '0 2px 4px rgba(0, 0, 0, 0.08)',
  e3: '0 4px 12px rgba(0, 0, 0, 0.10)',
  e4: '0 8px 24px rgba(0, 0, 0, 0.12)',
  focus: '0 0 0 2px rgba(27, 150, 255, 0.3)',
} as const

export const font = {
  // Inter for UI, JetBrains Mono for data/code, Cormorant for the hero title.
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
  display: "'Cormorant Garamond', Georgia, serif",
} as const

export const text = {
  caption: { fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' as const },
  meta: { fontSize: 12, letterSpacing: 0.2 },
  body: { fontSize: 13, lineHeight: 1.5 },
  emphasis: { fontSize: 13, fontWeight: 600 },
  kpiValue: { fontSize: 22, fontWeight: 600, letterSpacing: -0.2 },
  sectionHeader: { fontSize: 14, fontWeight: 600, letterSpacing: 0.1 },
  pageTitle: { fontSize: 18, fontWeight: 600 },
} as const
