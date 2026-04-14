import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { HelpBadge } from '../common/HelpBadge'
import { CalibrationChart } from './CalibrationChart'
import { MethodologyCompare } from './MethodologyCompare'
import { UncertaintyMaps } from './UncertaintyMaps'

export function UncertaintyTab() {
  const { data } = useQuery({ queryKey: ['uncertainty'], queryFn: api.uncertainty })
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 10,
        padding: 10,
        height: '100%',
        background: 'var(--bg-app)',
      }}
    >
      <Panel
        title="Calibration"
        subtitle="Actual coverage vs. target — closer to diagonal = better"
        help={{
          title: 'Reading this chart',
          body: (
            <>
              The X-axis is the <strong>target</strong> coverage we asked
              the predictor for (e.g. 90% means &quot;give me intervals that
              contain the true label 90% of the time&quot;). The Y-axis is the{' '}
              <strong>actual</strong> empirical coverage on held-out data.
              A well-calibrated method hugs the diagonal.{' '}
              <strong>GeoConformal</strong> (teal) comes with a theoretical
              finite-sample guarantee and tracks the diagonal; kriging
              variance (gold) systematically under-covers because it
              ignores true prediction difficulty.
            </>
          ),
        }}
      >
        <CalibrationChart data={data?.calibration ?? []} />
      </Panel>
      <Panel
        title="Why GeoConformal over kriging variance"
        subtitle="Distribution-free guarantees + spatial adaptivity"
      >
        <MethodologyCompare data={data ?? null} />
      </Panel>
      <Panel
        title="Interval width — GeoConformal vs. kriging variance"
        subtitle="Side-by-side uncertainty maps"
        help={{
          title: 'What you want to see',
          body: (
            <>
              The <strong>GeoConformal</strong> map should have visibly
              higher variance — some regions have tight intervals (confident
              predictions), others wide (harder to call). The{' '}
              <strong>kriging variance</strong> map should look nearly
              uniform because it depends only on sample density, not on
              actual geological complexity. A good UQ method <em>should</em>{' '}
              be non-uniform in space.
            </>
          ),
        }}
        style={{ gridColumn: 'span 2' }}
      >
        <UncertaintyMaps data={data ?? null} />
      </Panel>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  style,
  help,
  children,
}: {
  title: string
  subtitle: string
  style?: React.CSSProperties
  help?: { title: string; body: React.ReactNode }
  children: React.ReactNode
}) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-e1)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...style,
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 600 }}>
          {title}
          {help && <HelpBadge title={help.title} body={help.body} />}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </section>
  )
}
