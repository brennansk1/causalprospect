import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { Header } from './components/layout/Header'
import { KPIStrip } from './components/layout/KPIStrip'
import { BenchmarkTab } from './components/benchmark/BenchmarkTab'
import { CausalTab } from './components/causal/CausalTab'
import { Geo3DTab } from './components/geo3d/Geo3DTab'
import { UncertaintyTab } from './components/uncertainty/UncertaintyTab'
import type { TabId } from './types'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
})

export default function App() {
  const [tab, setTab] = useState<TabId>('geo3d')

  return (
    <QueryClientProvider client={queryClient}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          minWidth: 1280,
          background: 'var(--bg-app)',
        }}
      >
        <Header tab={tab} onTabChange={setTab} />
        <KPIStrip />
        <main style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {tab === 'geo3d' && <Geo3DTab />}
          {tab === 'causal' && <CausalTab />}
          {tab === 'benchmark' && <BenchmarkTab />}
          {tab === 'uncertainty' && <UncertaintyTab />}
        </main>
      </div>
    </QueryClientProvider>
  )
}
