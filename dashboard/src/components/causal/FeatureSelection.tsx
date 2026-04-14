import type { DAGPayload } from '../../types'

export function FeatureSelection({
  payload,
  selectedNode,
}: {
  payload: DAGPayload | null
  selectedNode: string | null
}) {
  const sel = payload?.selection
  return (
    <aside
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-e1)',
        padding: 18,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Causal feature selection</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
          Features are selected via d-separation on the discovered DAG — parents
          of the target are always included, colliders are excluded to prevent
          bias, and the minimal adjustment set (backdoor criterion) is added
          where needed.
        </p>
      </div>

      {sel && (
        <div
          style={{
            border: '1px solid rgba(42, 157, 143, 0.35)',
            borderLeft: '3px solid var(--data-teal)',
            background: 'rgba(42, 157, 143, 0.06)',
            borderRadius: 6,
            padding: '10px 12px',
          }}
        >
          <div className="mono" style={{ fontSize: 10, letterSpacing: 0.8, color: 'var(--data-teal)', textTransform: 'uppercase' }}>
            Result
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>
            {sel.reduction_pct.toFixed(1)}% feature reduction
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
            +{sel.auc_pr_improvement.toFixed(3)} AUC-PR vs. all-feature XGBoost
          </div>
        </div>
      )}

      {selectedNode && (
        <InspectedNode id={selectedNode} />
      )}

      <FeatureList
        title="Parents of target (direct causes)"
        items={sel?.parents ?? []}
        color="var(--data-success)"
        prefix="✓"
      />
      <FeatureList
        title="Adjustment set (backdoor)"
        items={sel?.adjustment_set ?? []}
        color="var(--brand)"
        prefix="↳"
      />
      <FeatureList
        title="Colliders — excluded"
        items={sel?.colliders_excluded ?? []}
        color="var(--data-danger)"
        prefix="✗"
      />
    </aside>
  )
}

function InspectedNode({ id }: { id: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: '8px 10px',
        background: 'var(--bg-subtle)',
      }}
    >
      <div className="mono" style={{ fontSize: 10, letterSpacing: 0.6, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        Inspecting
      </div>
      <div className="mono" style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
        {id}
      </div>
    </div>
  )
}

function FeatureList({
  title,
  items,
  color,
  prefix,
}: {
  title: string
  items: string[]
  color: string
  prefix: string
}) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: 0.7,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
          marginBottom: 6,
        }}
      >
        {title} · {items.length}
      </div>
      {items.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>(none)</div>
      )}
      {items.map((f) => (
        <div
          key={f}
          className="mono"
          style={{
            fontSize: 11,
            padding: '2px 0',
            color: 'var(--text-primary)',
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ color, fontWeight: 700, width: 12 }}>{prefix}</span>
          <span>{f}</span>
        </div>
      ))}
    </div>
  )
}
