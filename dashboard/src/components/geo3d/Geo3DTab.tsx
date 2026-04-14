import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '../../api/client'
import type { Deposit } from '../../types'
import { DepositInspector } from './DepositInspector'
import { GeoScene3D } from './GeoScene3D'
import { InfoPanel } from './InfoPanel'
import { SceneControls } from './SceneControls'

export interface SceneSettings {
  showTerrain: boolean
  showProspectivity: boolean
  showOccurrences: boolean
  showSubsurface: boolean
  showDrillHoles: boolean
  showLabels: boolean
  showContours: boolean
  crossSectionDepth: number // 0..1
  autoRotate: boolean
}

const DEFAULTS: SceneSettings = {
  // Default view is clean topographic — recruiter sees elevation + contours
  // first. Prospectivity overlay is one click away in the left panel.
  showTerrain: true,
  showProspectivity: false,
  showOccurrences: true,
  showSubsurface: true,
  showDrillHoles: true,
  showLabels: true,
  showContours: true,
  crossSectionDepth: 0.65,
  autoRotate: true,
}

export function Geo3DTab() {
  const [settings, setSettings] = useState<SceneSettings>(DEFAULTS)
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null)
  const { data: deposits = [] } = useQuery({ queryKey: ['deposits'], queryFn: api.deposits })
  const { data: drillHoles = [] } = useQuery({ queryKey: ['drill_holes'], queryFn: api.drillHoles })
  const { data: terrain } = useQuery({ queryKey: ['terrain'], queryFn: api.terrain })
  const { data: prospectivity = [] } = useQuery({
    queryKey: ['prospectivity_grid'],
    queryFn: api.prospectivityGrid,
  })
  const { data: occurrences = [] } = useQuery({
    queryKey: ['mrds_occurrences'],
    queryFn: api.mrdsOccurrences,
  })

  const selectedDeposit: Deposit | null =
    deposits.find((d) => d.id === selectedDepositId) ?? null
  const selectedHoles = drillHoles.filter((h) => h.deposit_id === selectedDepositId)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr 300px',
        height: '100%',
        gap: 10,
        padding: 10,
        background: 'var(--bg-app)',
      }}
    >
      <SceneControls settings={settings} onChange={setSettings} />
      <div
        style={{
          position: 'relative',
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: 'var(--shadow-e2)',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        <GeoScene3D
          settings={settings}
          deposits={deposits}
          drillHoles={drillHoles}
          occurrences={occurrences}
          terrain={terrain ?? null}
          prospectivity={prospectivity}
          selectedDepositId={selectedDepositId}
          onSelectDeposit={(id) => {
            setSelectedDepositId(id)
            setSettings((s) => ({ ...s, autoRotate: false }))
          }}
        />
        <SceneOverlay />
        <CompassWidget />
        <InfoPanel />
        <ProspectivityLegend />
      </div>
      <DepositInspector
        deposits={deposits}
        drillHoles={selectedHoles}
        selected={selectedDeposit}
        onSelect={(id) => {
          setSelectedDepositId(id)
          setSettings((s) => ({ ...s, autoRotate: false }))
        }}
      />
    </div>
  )
}

function SceneOverlay() {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          pointerEvents: 'none',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: 1,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Arizona · UTM Zone 12N · EPSG:32612
        </div>
        <div
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: -0.3,
          }}
        >
          Laramide Porphyry Copper Province
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.5 }}>
          NASADEM topography · USGS SGMC geology · Earth MRI aeromagnetic + radiometric · 11 porphyry
          copper deposits from live MRDS. Prospectivity overlay: causal XGBoost with GeoConformal intervals.
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace',
          letterSpacing: 0.5,
        }}
      >
        <div style={{ width: 40, height: 2, background: 'var(--text-muted)' }} />
        <span>≈ 20 km</span>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 80,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'var(--text-muted)',
          letterSpacing: 0.5,
          background: 'rgba(255,255,255,0.85)',
          padding: '4px 10px',
          borderRadius: 4,
          border: '1px solid var(--border)',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>Left-drag</span> orbit ·{' '}
        <span style={{ color: 'var(--text-secondary)' }}>Right-drag</span> pan ·{' '}
        <span style={{ color: 'var(--text-secondary)' }}>Scroll</span> zoom ·{' '}
        <span style={{ color: 'var(--text-secondary)' }}>Click</span> deposit
      </div>
    </>
  )
}

function CompassWidget() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-e1)',
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div
          style={{
            position: 'absolute',
            top: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--data-danger)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          N
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          S
        </div>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: 10,
            width: 2,
            height: 24,
            transform: 'translateX(-50%)',
            background:
              'linear-gradient(to bottom, var(--data-danger) 0%, var(--data-danger) 48%, var(--border-strong) 52%, var(--border-strong) 100%)',
          }}
        />
      </div>
    </div>
  )
}

function ProspectivityLegend() {
  const stops = ['#1e3a8a', '#0891b2', '#eab308', '#f97316', '#dc2626']
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(255,255,255,0.95)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-e1)',
        borderRadius: 4,
        padding: '6px 8px',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: 0.6,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Prospectivity
      </div>
      <div
        style={{
          width: 120,
          height: 8,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${stops.join(', ')})`,
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: 'var(--text-muted)',
          marginTop: 2,
        }}
      >
        <span>low</span>
        <span>high</span>
      </div>
    </div>
  )
}
