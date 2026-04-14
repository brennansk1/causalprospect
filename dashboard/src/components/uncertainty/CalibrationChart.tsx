import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CalibrationPoint } from '../../types'

export function CalibrationChart({ data }: { data: CalibrationPoint[] }) {
  if (data.length === 0) {
    return <div className="skeleton" style={{ width: '100%', height: '100%', minHeight: 180, borderRadius: 6 }} />
  }
  // Pipeline emits points in descending target order (alpha sweep from 0.02
  // up to 0.4). Sort ascending so the X-axis reads left-to-right from 60→100
  // as recruiters expect on a calibration plot.
  const rows = [...data]
    .sort((a, b) => a.target - b.target)
    .map((p) => ({
      target: Math.round(p.target * 100),
      geoconformal: p.geoconformal * 100,
      kriging: p.kriging * 100,
    }))

  const fmt = (v: number) => `${Math.round(v)}%`

  return (
    <ResponsiveContainer>
      <LineChart data={rows} margin={{ top: 10, right: 24, left: 12, bottom: 10 }}>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis
          type="number"
          dataKey="target"
          stroke="var(--text-muted)"
          tick={{ fontSize: 11 }}
          tickFormatter={fmt}
          label={{ value: 'target coverage', position: 'insideBottom', offset: -4, fontSize: 11 }}
          domain={[60, 100]}
          ticks={[60, 70, 80, 90, 100]}
          allowDecimals={false}
        />
        <YAxis
          type="number"
          stroke="var(--text-muted)"
          tick={{ fontSize: 11 }}
          tickFormatter={fmt}
          label={{
            value: 'actual coverage',
            angle: -90,
            position: 'insideLeft',
            fontSize: 11,
            offset: 0,
          }}
          domain={[30, 100]}
          ticks={[30, 50, 70, 90, 100]}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)' }}
          formatter={(value) => fmt(Number(value))}
          labelFormatter={(label) => `target ${fmt(Number(label))}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
        <ReferenceLine
          segment={[
            { x: 60, y: 60 },
            { x: 100, y: 100 },
          ]}
          stroke="#9aa1ac"
          strokeDasharray="3 4"
          label={{ value: 'ideal', position: 'insideTopLeft', fontSize: 10, fill: '#9aa1ac' }}
        />
        <Line
          type="monotone"
          dataKey="geoconformal"
          name="GeoConformal"
          stroke="var(--data-teal)"
          strokeWidth={2.4}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="kriging"
          name="Kriging variance"
          stroke="var(--data-gold)"
          strokeWidth={1.8}
          strokeDasharray="4 4"
          dot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
