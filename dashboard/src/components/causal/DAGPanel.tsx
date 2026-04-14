import { useMemo } from 'react'
import type { DAGEdge, DAGNode, DAGPayload } from '../../types'
import { HelpBadge } from '../common/HelpBadge'

const TIER_ORDER = [
  'TECTONIC',
  'MAGMATIC',
  'STRUCTURAL',
  'HYDROTHERMAL',
  'MINERALIZATION',
  'MEASUREMENT',
]

const TIER_COLOR: Record<string, string> = {
  TECTONIC: '#c7956d',
  MAGMATIC: '#d45d2a',
  STRUCTURAL: '#b07a3c',
  HYDROTHERMAL: '#2a9d8f',
  MINERALIZATION: '#e0a030',
  MEASUREMENT: '#6c7b9a',
  SUPERGENE: '#8a7a5c',
  GEOMORPHIC: '#8a9a6a',
  TARGET: '#ea001e',
}

interface Props {
  payload: DAGPayload | null
  hoveredNode: string | null
  onHover: (id: string | null) => void
  selectedNode: string | null
  onSelect: (id: string) => void
}

export function DAGPanel({ payload, hoveredNode, onHover, selectedNode, onSelect }: Props) {
  const { layout, edges } = useMemo(() => computeLayout(payload), [payload])

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-e1)',
        padding: 20,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          Porphyry Copper Mineral System — discovered DAG
          <HelpBadge
            title="What is this?"
            body={
              <>
                A <strong>Directed Acyclic Graph</strong> of the causal
                relationships in the Laramide porphyry copper system,
                recovered from the feature matrix by the PC algorithm and
                filtered against published geological constraints
                (Sillitoe 2010). Rows represent tiers of the mineral-system
                framework, from deep tectonic drivers down to surface
                measurements. Arrows show the direction of causation;
                heavier copper-colored edges have a strong statistical
                signal, thin grey-dashed edges are weaker and included for
                completeness. The right panel lists which features end up
                selected as causally-valid predictors of mineralization
                after d-separation filtering.
              </>
            }
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          PC Algorithm · α=0.05 · domain-constrained · SGC edges where
          spatial lag improves prediction (p&lt;0.05).
        </div>
      </div>

      {!payload ? (
        <div style={{ display: 'grid', placeItems: 'center', height: '80%' }}>
          <div className="skeleton" style={{ width: '70%', height: 240, borderRadius: 8 }} />
        </div>
      ) : (
        <svg
          viewBox="0 0 1000 720"
          style={{ width: '100%', height: 'calc(100% - 60px)', display: 'block' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="arrow-strong"
              viewBox="0 -5 10 10"
              refX="10"
              refY="0"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,-5L10,0L0,5" fill="#d45d2a" />
            </marker>
            <marker
              id="arrow-weak"
              viewBox="0 -5 10 10"
              refX="10"
              refY="0"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,-5L10,0L0,5" fill="#9aa1ac" />
            </marker>
          </defs>

          {/* Tier band labels — computed from layout so multi-row tiers stay
              inside their own band. */}
          {(() => {
            const seen = new Map<string, number>()
            for (const [, p] of layout) {
              // Not used; layout tier Y already derived in computeLayout.
              void p
              void seen
            }
            let cursor = 60
            return TIER_ORDER.map((tier) => {
              const nodesInTier = payload.nodes.filter((n) =>
                n.kind === 'target' ? tier === 'MINERALIZATION' : n.tier === tier,
              )
              const rows = Math.max(1, Math.ceil(nodesInTier.length / 6))
              const top = cursor
              cursor += 100 + (rows - 1) * 40
              return (
                <g key={tier}>
                  <line
                    x1={0}
                    x2={1000}
                    y1={top}
                    y2={top}
                    stroke="var(--border)"
                    strokeDasharray="3,4"
                  />
                  <text
                    x={6}
                    y={top + 18}
                    fontSize={9}
                    letterSpacing={1}
                    fill="var(--text-muted)"
                    style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}
                  >
                    {tier}
                  </text>
                </g>
              )
            })
          })()}

          {edges.map((e, i) => {
            const a = layout.get(e.source)
            const b = layout.get(e.target)
            if (!a || !b) return null
            const strong = e.weight >= 0.6
            const highlighted =
              selectedNode !== null && (e.source === selectedNode || e.target === selectedNode)
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={strong ? '#d45d2a' : '#aab0bc'}
                strokeWidth={strong ? 1.8 + e.weight * 1.2 : 1}
                strokeDasharray={strong ? undefined : '4,4'}
                opacity={highlighted ? 1 : selectedNode ? 0.2 : 0.8}
                markerEnd={strong ? 'url(#arrow-strong)' : 'url(#arrow-weak)'}
              />
            )
          })}

          {[...layout.entries()].map(([id, pos]) => {
            const node = payload.nodes.find((n) => n.id === id)
            if (!node) return null
            const isTarget = node.kind === 'target'
            const highlighted = selectedNode === id || hoveredNode === id
            const faded =
              selectedNode !== null &&
              selectedNode !== id &&
              !edges.some(
                (e) =>
                  (e.source === id && e.target === selectedNode) ||
                  (e.target === id && e.source === selectedNode),
              )
            const color = isTarget ? TIER_COLOR.TARGET : TIER_COLOR[node.tier] ?? '#6c7b9a'
            return (
              <g
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => onHover(id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onSelect(id)}
                style={{ cursor: 'pointer', opacity: faded ? 0.35 : 1, transition: 'opacity 150ms' }}
              >
                <rect
                  x={-pos.w / 2}
                  y={-pos.h / 2}
                  width={pos.w}
                  height={pos.h}
                  rx={isTarget ? 8 : 5}
                  fill={isTarget ? '#fff5f5' : '#fff'}
                  stroke={color}
                  strokeWidth={isTarget ? 2.4 : highlighted ? 2 : 1.4}
                  filter={highlighted ? 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' : undefined}
                />
                <text
                  y={isTarget ? -4 : 0}
                  textAnchor="middle"
                  fontSize={isTarget ? 13 : 11}
                  fontWeight={isTarget ? 700 : 600}
                  fill={isTarget ? color : 'var(--text-primary)'}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {node.label}
                </text>
                {isTarget && (
                  <text
                    y={12}
                    textAnchor="middle"
                    fontSize={9}
                    letterSpacing={1}
                    fill={color}
                    style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}
                  >
                    target
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

function computeLayout(payload: DAGPayload | null): {
  layout: Map<string, { x: number; y: number; w: number; h: number }>
  edges: DAGEdge[]
} {
  const layout = new Map<string, { x: number; y: number; w: number; h: number }>()
  if (!payload) return { layout, edges: [] }

  const byTier = new Map<string, DAGNode[]>()
  for (const n of payload.nodes) {
    const tier = n.kind === 'target' ? 'MINERALIZATION' : n.tier
    if (!byTier.has(tier)) byTier.set(tier, [])
    byTier.get(tier)!.push(n)
  }

  const margin = 60
  const width = 1000
  const tierHeight = 100
  // Wrap tier contents onto multiple rows if there are too many nodes — keeps
  // labels legible instead of overlapping into the next tier's band.
  const maxPerRow = 6
  let yCursor = 80
  const tierY = new Map<string, number>()
  for (const tier of TIER_ORDER) {
    const nodes = byTier.get(tier) ?? []
    const rows = Math.max(1, Math.ceil(nodes.length / maxPerRow))
    tierY.set(tier, yCursor)
    yCursor += tierHeight + (rows - 1) * 40
    const perRow = Math.min(nodes.length, maxPerRow) || 1
    const spacing = (width - 2 * margin) / perRow
    nodes.forEach((n, ni) => {
      const row = Math.floor(ni / maxPerRow)
      const col = ni % maxPerRow
      const y = tierY.get(tier)! + row * 42
      const x = margin + spacing * (col + 0.5)
      const label = n.label
      const w = Math.max(100, Math.min(160, label.length * 6.8 + 16))
      const h = n.kind === 'target' ? 44 : 30
      layout.set(n.id, { x, y, w, h })
    })
  }
  return { layout, edges: payload.edges }
}
