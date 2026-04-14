import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ModelResult } from '../../types'

export function FeatureCountChart({ models }: { models: ModelResult[] }) {
  if (models.length === 0) {
    return <div className="skeleton" style={{ width: '100%', height: '100%', minHeight: 180, borderRadius: 6 }} />
  }
  const data = models.map((m) => ({ name: m.name, features: m.features, auc: m.auc_pr }))
  return (
    <ResponsiveContainer>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40, top: 8, bottom: 8 }}>
        <XAxis type="number" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="var(--text-muted)"
          tick={{ fontSize: 11 }}
          width={250}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)' }}
          formatter={(v, _n, ctx) => [
            `${v} features · AUC-PR ${(ctx.payload as any).auc?.toFixed(3)}`,
            'Count',
          ]}
        />
        <Bar dataKey="features" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => {
            const color = d.features <= 15 ? '#2a9d8f' : d.features <= 30 ? '#e0a030' : '#94a3b8'
            return <Cell key={i} fill={color} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
