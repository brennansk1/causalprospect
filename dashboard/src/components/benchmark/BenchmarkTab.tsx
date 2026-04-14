import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { HelpBadge } from '../common/HelpBadge'
import { FeatureCountChart } from './FeatureCountChart'
import { ModelTable } from './ModelTable'
import { SuccessRateChart } from './SuccessRateChart'

export function BenchmarkTab() {
  const { data } = useQuery({ queryKey: ['benchmark'], queryFn: api.benchmark })

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1.1fr 0.9fr',
        gap: 10,
        padding: 10,
        height: '100%',
        background: 'var(--bg-app)',
      }}
    >
      <Panel
        title="Success-rate curves"
        subtitle="% deposits found vs. % area examined"
        help={{
          title: 'Success-rate curves',
          body: (
            <>
              Mining exploration success rates read directly off this plot:
              the Y-axis shows what fraction of known deposits are captured
              when you drill the top-ranked X% of grid cells. A steeper
              curve means fewer unproductive drill holes before you find
              mineralization. The top curve (<strong>XGBoost + Causal +
              GeoConformal</strong>) captures &gt;50% of deposits in the top
              10% of cells — the industry-standard Weights-of-Evidence
              baseline captures far less.
            </>
          ),
        }}
      >
        <SuccessRateChart curves={data?.success_rate_curves ?? {}} />
      </Panel>
      <Panel
        title="Model performance"
        subtitle="Spatial block CV · AUC-ROC, AUC-PR, feature count"
        help={{
          title: 'Why these metrics?',
          body: (
            <>
              <strong>AUC-PR</strong> (area under the precision-recall
              curve) is the right metric for mineral prospectivity because
              positives are rare (~0.1% of cells). AUC-ROC can look
              artificially high under class imbalance.{' '}
              <strong>Spatial block CV</strong> partitions the study area
              into contiguous blocks so training and test sets cannot share
              nearby cells — this prevents spatial autocorrelation from
              inflating metrics.
            </>
          ),
        }}
      >
        <ModelTable models={data?.models ?? []} />
      </Panel>
      <Panel
        title="Feature count per model"
        subtitle="Causal discovery removed irrelevant features while matching or beating all-feature AUC"
        help={{
          title: 'Feature reduction',
          body: (
            <>
              The causal-selection step uses{' '}
              <strong>d-separation</strong> on the discovered DAG to pick
              only features that are genuine ancestors of the target
              (direct or indirect causes). Colliders and effects of the
              target are dropped. A smaller feature set that matches or
              beats the all-feature model is evidence the dropped features
              were statistical noise, not causal signal.
            </>
          ),
        }}
        style={{ gridColumn: 'span 2' }}
      >
        <FeatureCountChart models={data?.models ?? []} />
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
