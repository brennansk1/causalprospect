import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SERIES_STYLE: Record<string, { name: string; color: string; fillOpacity: number }> = {
  xgb_causal: { name: 'XGBoost + Causal + GeoConformal', color: '#d45d2a', fillOpacity: 0.25 },
  xgb_all: { name: 'XGBoost (all features)', color: '#e0a030', fillOpacity: 0.15 },
  woe: { name: 'Weights of Evidence', color: '#6c7b9a', fillOpacity: 0.1 },
  gat_causal: { name: 'GAT + Causal', color: '#2a9d8f', fillOpacity: 0.18 },
}

/** Pipeline emits either:
 *   a) `{area_examined: number[], deposits_found: number[]}` (preferred), or
 *   b) `SuccessRatePoint[]` — a pre-zipped array.
 *  Normalize either shape to zipped point arrays before plotting. */
interface ZippedCurves {
  area_examined: number[]
  deposits_found: number[]
}

type CurveInput = ZippedCurves | { area_examined: number; deposits_found: number }[]

function toPoints(c: CurveInput): { area_examined: number; deposits_found: number }[] {
  if (Array.isArray(c)) return c
  const n = Math.min(c.area_examined?.length ?? 0, c.deposits_found?.length ?? 0)
  const out: { area_examined: number; deposits_found: number }[] = []
  // Pipeline success curves are ~5000 points — downsample to keep the chart
  // snappy. 200 anchor points preserves visual fidelity.
  const stride = Math.max(1, Math.floor(n / 200))
  for (let i = 0; i < n; i += stride) {
    out.push({ area_examined: c.area_examined[i], deposits_found: c.deposits_found[i] })
  }
  return out
}

interface Props {
  curves: Record<string, CurveInput>
}

export function SuccessRateChart({ curves }: Props) {
  const keys = Object.keys(curves)
  if (keys.length === 0) {
    return <Empty />
  }
  const normalized: Record<string, { area_examined: number; deposits_found: number }[]> =
    Object.fromEntries(keys.map((k) => [k, toPoints(curves[k])]))
  const xs = Array.from({ length: 51 }, (_, i) => i / 50)
  const data = xs.map((x) => {
    const row: Record<string, number> = { x: x * 100 }
    for (const k of keys) {
      row[k] = interpolateCurve(normalized[k], x) * 100
    }
    return row
  })

  return (
    <ResponsiveContainer>
      <AreaChart data={data} margin={{ top: 8, right: 18, left: -10, bottom: 4 }}>
        <defs>
          {keys.map((k) => {
            const s = SERIES_STYLE[k] ?? { name: k, color: '#999', fillOpacity: 0.15 }
            return (
              <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={s.fillOpacity} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis
          dataKey="x"
          stroke="var(--text-muted)"
          tick={{ fontSize: 11 }}
          label={{ value: '% study area examined', position: 'insideBottom', offset: -2, fontSize: 11 }}
        />
        <YAxis
          stroke="var(--text-muted)"
          tick={{ fontSize: 11 }}
          label={{ value: '% deposits found', angle: -90, position: 'insideLeft', fontSize: 11, offset: 10 }}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid var(--border)' }}
          labelFormatter={(v) => `${Number(v).toFixed(0)}% area`}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
          formatter={(k) => SERIES_STYLE[String(k)]?.name ?? String(k)}
        />
        {keys.map((k) => {
          const s = SERIES_STYLE[k] ?? { name: k, color: '#999', fillOpacity: 0.15 }
          return (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              stroke={s.color}
              strokeWidth={k === 'xgb_causal' ? 2.2 : 1.4}
              fill={`url(#g-${k})`}
              activeDot={{ r: 4 }}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}

function interpolateCurve(
  pts: { area_examined: number; deposits_found: number }[],
  x: number,
): number {
  if (pts.length === 0) return 0
  if (x <= pts[0].area_examined) return pts[0].deposits_found
  for (let i = 1; i < pts.length; i++) {
    if (pts[i].area_examined >= x) {
      const p0 = pts[i - 1]
      const p1 = pts[i]
      const t = (x - p0.area_examined) / Math.max(1e-9, p1.area_examined - p0.area_examined)
      return p0.deposits_found + (p1.deposits_found - p0.deposits_found) * t
    }
  }
  return pts[pts.length - 1].deposits_found
}

function Empty() {
  return (
    <div
      className="skeleton"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 6,
        minHeight: 200,
      }}
    />
  )
}
