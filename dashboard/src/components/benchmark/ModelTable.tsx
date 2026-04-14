import type { ModelResult } from '../../types'

export function ModelTable({ models }: { models: ModelResult[] }) {
  if (models.length === 0) {
    return <div className="skeleton" style={{ height: '100%', minHeight: 220, borderRadius: 6 }} />
  }
  const champion = models.reduce((a, b) => (b.auc_pr > a.auc_pr ? b : a), models[0])
  const baseline = models.find((m) => /woe|weight/i.test(m.name)) ?? models[0]
  const lift = (champion.auc_pr - baseline.auc_pr) / baseline.auc_pr

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      <div style={{ overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead style={{ background: 'var(--bg-subtle)' }}>
            <tr>
              <Th>Model</Th>
              <Th align="right">AUC-ROC</Th>
              <Th align="right">AUC-PR</Th>
              <Th align="right">Features</Th>
              <Th>UQ</Th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => {
              const isChamp = m === champion
              return (
                <tr
                  key={m.name}
                  style={{
                    background: isChamp ? 'rgba(212, 93, 42, 0.06)' : '#fff',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <Td bold={isChamp}>
                    {isChamp && <span style={{ color: 'var(--data-copper)', marginRight: 4 }}>●</span>}
                    {m.name}
                  </Td>
                  <Td align="right" mono>
                    {m.auc_roc.toFixed(3)}
                  </Td>
                  <Td align="right" mono bold={isChamp}>
                    {m.auc_pr.toFixed(3)}
                  </Td>
                  <Td align="right" mono>
                    {m.features}
                  </Td>
                  <Td>{m.uq}</Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          border: '1px solid rgba(212, 93, 42, 0.35)',
          borderLeft: '3px solid var(--data-copper)',
          background: 'rgba(212, 93, 42, 0.05)',
          borderRadius: 6,
          padding: '10px 12px',
        }}
      >
        <div
          className="mono"
          style={{ fontSize: 10, letterSpacing: 0.8, color: 'var(--data-copper)', textTransform: 'uppercase' }}
        >
          Key result
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--data-copper)' }}>+{(lift * 100).toFixed(0)}% AUC-PR</strong> over
          the Weights-of-Evidence industry baseline, using{' '}
          <strong>{champion.features} features</strong> vs. the full{' '}
          {Math.max(...models.map((m) => m.features))}-feature set — and with calibrated intervals from
          GeoConformal prediction.
        </div>
      </div>
    </div>
  )
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontSize: 10,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align = 'left',
  mono,
  bold,
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
  mono?: boolean
  bold?: boolean
}) {
  return (
    <td
      className={mono ? 'mono' : undefined}
      style={{
        textAlign: align,
        padding: '8px 10px',
        fontWeight: bold ? 600 : 400,
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </td>
  )
}
