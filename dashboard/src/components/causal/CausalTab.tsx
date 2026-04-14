import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/client'
import { DAGPanel } from './DAGPanel'
import { FeatureSelection } from './FeatureSelection'

export function CausalTab() {
  const { data } = useQuery({ queryKey: ['causal_dag'], queryFn: api.causalDag })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>('deposit_present')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 10,
        padding: 10,
        height: '100%',
        background: 'var(--bg-app)',
      }}
    >
      <DAGPanel
        payload={data ?? null}
        hoveredNode={hoveredNode}
        onHover={setHoveredNode}
        selectedNode={selectedNode}
        onSelect={setSelectedNode}
      />
      <FeatureSelection payload={data ?? null} selectedNode={selectedNode} />
    </div>
  )
}
