import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Line, OrbitControls } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type {
  Deposit,
  DrillHole,
  MrdsOccurrence,
  ProspectivityCell,
  TerrainPayload,
} from '../../types'
import { gradeColor, prospectivityColor } from './colors'
import { marchingSquares } from './contours'
import {
  AZ_WEST_BORDER,
  HIGHWAYS,
  MEXICO_BORDER,
  NM_BORDER,
  REFERENCE_CITIES,
  RIVERS,
} from './geoReference'
import type { SceneSettings } from './Geo3DTab'

// Scene plane footprint (1 unit ≈ 12 km at the plane).
const SCENE_W = 48
const SCENE_H = 36
// 5× is enough for relief to read clearly on an overview camera without
// caricaturing the real Basin-and-Range topography.
const VERTICAL_EXAGGERATION = 5.0

function geoToScenePlanar(lon: number, lat: number, bbox: [number, number, number, number]) {
  const [minLon, minLat, maxLon, maxLat] = bbox
  const x = ((lon - minLon) / (maxLon - minLon) - 0.5) * SCENE_W
  const z = -((lat - minLat) / (maxLat - minLat) - 0.5) * SCENE_H
  return { x, z }
}

function sampleTerrainElevation(
  lon: number,
  lat: number,
  terrain: TerrainPayload | null,
  bbox: [number, number, number, number],
) {
  if (!terrain) return 0.4
  const [minLon, minLat, maxLon, maxLat] = bbox
  const u = (lon - minLon) / (maxLon - minLon)
  const v = (lat - minLat) / (maxLat - minLat)
  const px = Math.min(terrain.width - 1, Math.max(0, Math.round(u * (terrain.width - 1))))
  const py = Math.min(terrain.height - 1, Math.max(0, Math.round((1 - v) * (terrain.height - 1))))
  const e = terrain.elevation_m[py * terrain.width + px]
  const range = Math.max(1, terrain.max_elevation_m - terrain.min_elevation_m)
  return (e - terrain.min_elevation_m) / range
}

function sceneY(elevFrac: number) {
  return elevFrac * VERTICAL_EXAGGERATION
}

/**
 * Elevation-to-color ramp styled after USGS topographic maps:
 * - Low (<10%): muted tan desert basin
 * - 10–30%: desert khaki
 * - 30–55%: olive/sage mid elevations
 * - 55–80%: warm brown uplift
 * - 80–100%: greyish-ochre high country
 */
function topoColor(elevFrac: number): THREE.Color {
  const stops = [
    [0.0, new THREE.Color('#cbb489')],
    [0.12, new THREE.Color('#baa375')],
    [0.3, new THREE.Color('#8e995b')],
    [0.55, new THREE.Color('#6a7840')],
    [0.75, new THREE.Color('#8a6e45')],
    [0.9, new THREE.Color('#a48558')],
    [1.0, new THREE.Color('#c0b296')],
  ] as const
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, c0] = stops[i]
    const [t1, c1] = stops[i + 1]
    if (elevFrac <= t1) {
      const t = (elevFrac - t0) / Math.max(1e-6, t1 - t0)
      return c0.clone().lerp(c1, t)
    }
  }
  return stops[stops.length - 1][1].clone()
}

interface Props {
  settings: SceneSettings
  deposits: Deposit[]
  drillHoles: DrillHole[]
  occurrences: MrdsOccurrence[]
  terrain: TerrainPayload | null
  prospectivity: ProspectivityCell[]
  selectedDepositId: string | null
  onSelectDeposit: (id: string) => void
}

export function GeoScene3D(props: Props) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [38, 28, 38], fov: 42, near: 0.1, far: 500 }}
      style={{ width: '100%', height: '100%', cursor: 'grab' }}
      onPointerDown={(e) => ((e.currentTarget as HTMLElement).style.cursor = 'grabbing')}
      onPointerUp={(e) => ((e.currentTarget as HTMLElement).style.cursor = 'grab')}
    >
      <color attach="background" args={['#f4f6fa']} />
      <fog attach="fog" args={['#e6eaf0', 100, 200]} />

      <ambientLight intensity={0.4} />
      {/* Warm sun from NW — matches USGS hillshade convention (315°, 45°). */}
      <directionalLight
        position={[40, 55, 40]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={140}
        color="#fff2d9"
      />
      <directionalLight position={[-30, 20, -20]} intensity={0.25} color="#9cb3d1" />
      <Environment preset="sunset" />

      <CameraEntrance />
      <SceneContents {...props} />

      <OrbitControls
        makeDefault
        enablePan
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.85}
        zoomSpeed={1.15}
        panSpeed={0.9}
        screenSpacePanning
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.49}
        minDistance={6}
        maxDistance={130}
        autoRotate={props.settings.autoRotate}
        autoRotateSpeed={0.3}
        target={[0, 1, 0]}
      />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.4} luminanceThreshold={0.7} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.28} darkness={0.35} />
      </EffectComposer>
    </Canvas>
  )
}

function CameraEntrance() {
  const { camera } = useThree()
  const done = useRef(false)
  const start = useRef<number | null>(null)

  useFrame(({ clock }) => {
    if (done.current) return
    if (start.current === null) start.current = clock.getElapsedTime()
    const t = clock.getElapsedTime() - start.current
    const duration = 2.6
    if (t >= duration) {
      done.current = true
      camera.position.set(38, 28, 38)
      camera.lookAt(0, 1, 0)
      return
    }
    const e = 1 - Math.pow(1 - t / duration, 3)
    const angle = Math.PI * 0.25 + e * Math.PI * 0.18
    const r = 90 - e * 52
    const y = 70 - e * 42
    camera.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
    camera.lookAt(0, 1, 0)
  })
  return null
}

function SceneContents({
  settings,
  deposits,
  drillHoles,
  occurrences,
  terrain,
  prospectivity,
  selectedDepositId,
  onSelectDeposit,
}: Props) {
  const bbox: [number, number, number, number] = terrain?.bbox ?? [-113, 31, -109, 34.5]

  return (
    <>
      {settings.showTerrain && (
        <Terrain terrain={terrain} prospectivity={prospectivity} settings={settings} bbox={bbox} />
      )}
      <Graticule bbox={bbox} terrain={terrain} />
      {settings.showContours && <ContourOverlay bbox={bbox} terrain={terrain} />}
      <BorderOverlay bbox={bbox} terrain={terrain} />
      <HighwayOverlay bbox={bbox} terrain={terrain} />
      <RiverOverlay bbox={bbox} terrain={terrain} />
      <CityMarkers bbox={bbox} terrain={terrain} />
      {settings.showOccurrences && (
        <MrdsOccurrences occurrences={occurrences} bbox={bbox} terrain={terrain} />
      )}

      {settings.showDrillHoles &&
        drillHoles.map((h) => (
          <DrillHoleMesh
            key={h.id}
            hole={h}
            bbox={bbox}
            terrain={terrain}
            isHighlighted={h.deposit_id === selectedDepositId}
          />
        ))}
      {deposits.map((d) => (
        <DepositMarker
          key={d.id}
          deposit={d}
          bbox={bbox}
          terrain={terrain}
          selected={d.id === selectedDepositId}
          showLabel={settings.showLabels}
          onSelect={() => onSelectDeposit(d.id)}
        />
      ))}
      {/* Shadow catcher below terrain base. */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SCENE_W * 3, SCENE_H * 3]} />
        <shadowMaterial opacity={0.22} />
      </mesh>
    </>
  )
}

/* --------------------------------- Terrain -------------------------------- */

function Terrain({
  terrain,
  prospectivity,
  settings,
  bbox,
}: {
  terrain: TerrainPayload | null
  prospectivity: ProspectivityCell[]
  settings: SceneSettings
  bbox: [number, number, number, number]
}) {
  const geom = useMemo(() => {
    const segsX = 256
    const segsY = 192
    const g = new THREE.PlaneGeometry(SCENE_W, SCENE_H, segsX, segsY)
    g.rotateX(-Math.PI / 2)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 3)

    // Build the elevation lookup.
    const [minLon, minLat, maxLon, maxLat] = bbox
    const tw = terrain?.width ?? 0
    const th = terrain?.height ?? 0
    const minElev = terrain?.min_elevation_m ?? 0
    const maxElev = terrain?.max_elevation_m ?? 3000
    const elevRange = Math.max(1, maxElev - minElev)

    // Prospectivity raster lookup at terrain resolution.
    const pw = segsX + 1
    const ph = segsY + 1
    const pgrid = new Float32Array(pw * ph)
    const pcount = new Float32Array(pw * ph)
    for (const c of prospectivity) {
      const gx = Math.round(((c.lon - minLon) / (maxLon - minLon)) * segsX)
      const gy = Math.round(((c.lat - minLat) / (maxLat - minLat)) * segsY)
      if (gx < 0 || gy < 0 || gx > segsX || gy > segsY) continue
      const idx = gy * pw + gx
      pgrid[idx] += c.prospectivity
      pcount[idx] += 1
    }
    for (let i = 0; i < pgrid.length; i++) {
      if (pcount[i] > 0) pgrid[i] /= pcount[i]
    }

    // Pass 1: write elevations + collect for neighbor-based hillshade.
    const elev = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const u = (x + SCENE_W / 2) / SCENE_W
      const v = (z + SCENE_H / 2) / SCENE_H
      let frac = 0.4
      if (terrain && tw > 0 && th > 0) {
        const px = Math.min(tw - 1, Math.max(0, Math.round(u * (tw - 1))))
        const py = Math.min(th - 1, Math.max(0, Math.round((1 - v) * (th - 1))))
        const e = terrain.elevation_m[py * tw + px]
        // Guard against the NASADEM nodata sentinel (-32768).
        const eClean = Math.max(minElev, e)
        frac = (eClean - minElev) / elevRange
      } else {
        const r1 = Math.sin(u * 7.1 + 0.3) * Math.cos(v * 5.4 + 1.2)
        const r2 = Math.sin(u * 14 + 4) * Math.cos(v * 11 + 2)
        frac = 0.4 + 0.3 * r1 + 0.08 * r2
      }
      elev[i] = frac
      pos.setY(i, sceneY(frac))
    }

    // Pass 2: color with hillshade blended into topographic ramp + optional
    // prospectivity overlay.
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const u = (x + SCENE_W / 2) / SCENE_W
      const v = (z + SCENE_H / 2) / SCENE_H
      const gx = Math.round(u * segsX)
      const gy = Math.round(v * segsY)
      const p = pgrid[gy * pw + gx] ?? 0

      const topo = topoColor(elev[i])

      let color: THREE.Color
      if (settings.showProspectivity) {
        const over = prospectivityColor(p)
        color = topo.clone().multiplyScalar(0.55).add(over.multiplyScalar(0.7))
      } else {
        color = topo
      }

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    g.computeVertexNormals()
    return g
  }, [terrain, prospectivity, settings.showProspectivity, bbox])

  return (
    <mesh geometry={geom} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.92}
        metalness={0.02}
        // Push the terrain fragments slightly back in the depth buffer so
        // draped layers (contours, graticule, borders, highways) render in
        // front without z-fighting.
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  )
}

/* ------------------------------- Graticule -------------------------------- */

function Graticule({ bbox, terrain }: { bbox: [number, number, number, number]; terrain: TerrainPayload | null }) {
  const lines = useMemo(() => {
    const [minLon, minLat, maxLon, maxLat] = bbox
    const out: ReactNode[] = []
    // Integer degree lines.
    for (let lat = Math.ceil(minLat); lat <= Math.floor(maxLat); lat++) {
      const pts: [number, number, number][] = []
      for (let lon = minLon; lon <= maxLon + 1e-6; lon += 0.25) {
        const { x, z } = geoToScenePlanar(lon, lat, bbox)
        const y = sceneY(sampleTerrainElevation(lon, lat, terrain, bbox)) + 0.02
        pts.push([x, y, z])
      }
      out.push(
        <Line
          key={`lat-${lat}`}
          points={pts}
          color="#ffffff"
          transparent
          opacity={0.22}
          lineWidth={1}
        />,
      )
    }
    for (let lon = Math.ceil(minLon); lon <= Math.floor(maxLon); lon++) {
      const pts: [number, number, number][] = []
      for (let lat = minLat; lat <= maxLat + 1e-6; lat += 0.25) {
        const { x, z } = geoToScenePlanar(lon, lat, bbox)
        const y = sceneY(sampleTerrainElevation(lon, lat, terrain, bbox)) + 0.02
        pts.push([x, y, z])
      }
      out.push(
        <Line
          key={`lon-${lon}`}
          points={pts}
          color="#ffffff"
          transparent
          opacity={0.22}
          lineWidth={1}
        />,
      )
    }
    return out
  }, [bbox, terrain])
  return <group>{lines}</group>
}

/* ------------------------------- Contours --------------------------------- */
//
// Elevation contours at 250 m intervals, with index contours (every 1000 m)
// drawn thicker and labeled. Rendered as draped line segments projected from
// the NASADEM grid into scene space.

function ContourOverlay({
  bbox,
  terrain,
}: {
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  const { regular, index, labels } = useMemo(() => {
    if (!terrain || terrain.width === 0) return { regular: null, index: null, labels: [] as { pos: [number, number, number]; text: string }[] }

    const w = terrain.width
    const h = terrain.height
    const e = terrain.elevation_m
    const elevLo = terrain.min_elevation_m
    const elevHi = terrain.max_elevation_m
    const elevRange = Math.max(1, elevHi - elevLo)

    // Contour levels: every 250 m. Index contours (bold + labeled) every 1000 m.
    const regularLevels: number[] = []
    const indexLevels: number[] = []
    const startLevel = Math.ceil(elevLo / 250) * 250
    for (let lvl = startLevel; lvl <= elevHi; lvl += 250) {
      if (lvl % 1000 === 0) indexLevels.push(lvl)
      else regularLevels.push(lvl)
    }

    const toScene = (gx: number, gy: number, elevM: number): [number, number, number] => {
      const u = gx / (w - 1)
      const v = 1 - gy / (h - 1)
      const x = (u - 0.5) * SCENE_W
      const z = -(v - 0.5) * SCENE_H
      const frac = (elevM - elevLo) / elevRange
      const y = sceneY(frac) + 0.04
      return [x, y, z]
    }

    const buildGeometry = (contours: ReturnType<typeof marchingSquares>) => {
      const positions: number[] = []
      for (const c of contours) {
        for (let i = 0; i < c.segments.length; i += 4) {
          const x0 = c.segments[i]
          const y0 = c.segments[i + 1]
          const x1 = c.segments[i + 2]
          const y1 = c.segments[i + 3]
          const a = toScene(x0, y0, c.elevation)
          const b = toScene(x1, y1, c.elevation)
          positions.push(...a, ...b)
        }
      }
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      return g
    }

    const regular = buildGeometry(marchingSquares(e, w, h, regularLevels))
    const indexCs = marchingSquares(e, w, h, indexLevels)
    const index = buildGeometry(indexCs)

    // Sample one label per index contour at a reasonable grid cell.
    const labels: { pos: [number, number, number]; text: string }[] = []
    for (const c of indexCs) {
      if (c.segments.length === 0) continue
      // Pick the midpoint of the middle segment so labels land on real relief.
      const midIdx = Math.floor(c.segments.length / 8) * 4
      const x = (c.segments[midIdx] + c.segments[midIdx + 2]) / 2
      const y = (c.segments[midIdx + 1] + c.segments[midIdx + 3]) / 2
      const pos = toScene(x, y, c.elevation)
      pos[1] += 0.15
      labels.push({ pos, text: `${c.elevation} m` })
    }

    return { regular, index, labels }
  }, [bbox, terrain])

  if (!regular || !index) return null

  return (
    <group>
      <lineSegments geometry={regular}>
        <lineBasicMaterial
          color="#2b1a08"
          transparent
          opacity={0.55}
          depthTest
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={index}>
        <lineBasicMaterial
          color="#1a0f04"
          transparent
          opacity={0.92}
          depthTest
          depthWrite={false}
        />
      </lineSegments>
      {labels.map((l, i) => (
        <Html key={i} position={l.pos} center distanceFactor={28} style={{ pointerEvents: 'none' }}>
          <div
            style={{
              padding: '1px 5px',
              fontSize: 9,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#4a2a10',
              background: 'rgba(255, 245, 230, 0.88)',
              border: '1px solid rgba(74, 42, 16, 0.25)',
              borderRadius: 2,
              letterSpacing: 0.3,
              whiteSpace: 'nowrap',
            }}
          >
            {l.text}
          </div>
        </Html>
      ))}
    </group>
  )
}

/* -------------------------------- Borders --------------------------------- */

function drape(
  points: [number, number][],
  bbox: [number, number, number, number],
  terrain: TerrainPayload | null,
  yOffset: number,
): [number, number, number][] {
  return points.map(([lat, lon]) => {
    const { x, z } = geoToScenePlanar(lon, lat, bbox)
    const y = sceneY(sampleTerrainElevation(lon, lat, terrain, bbox)) + yOffset
    return [x, y, z]
  })
}

function BorderOverlay({
  bbox,
  terrain,
}: {
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  const mexicoPts = useMemo(() => drape(MEXICO_BORDER, bbox, terrain, 0.08), [bbox, terrain])
  const nmPts = useMemo(() => drape(NM_BORDER, bbox, terrain, 0.08), [bbox, terrain])
  const westPts = useMemo(() => drape(AZ_WEST_BORDER, bbox, terrain, 0.08), [bbox, terrain])
  return (
    <group>
      <Line points={mexicoPts} color="#c0392b" lineWidth={3} dashed dashSize={0.4} gapSize={0.2} transparent opacity={0.95} />
      <Line points={nmPts} color="#444444" lineWidth={2.4} dashed dashSize={0.4} gapSize={0.25} transparent opacity={0.85} />
      <Line points={westPts} color="#444444" lineWidth={2.4} dashed dashSize={0.4} gapSize={0.25} transparent opacity={0.85} />
      {/* Label: Mexico border */}
      <Html position={[...drape([[31.35, -110.93]], bbox, terrain, 0.4)[0]] as [number, number, number]} center distanceFactor={22}>
        <div
          style={{
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#fff',
            background: 'rgba(192, 57, 43, 0.9)',
            borderRadius: 3,
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          MEXICO · SONORA
        </div>
      </Html>
      <Html position={[...drape([[33.5, -109.05]], bbox, terrain, 0.4)[0]] as [number, number, number]} center distanceFactor={22}>
        <div
          style={{
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#333',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 3,
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          NEW MEXICO
        </div>
      </Html>
      <Html position={[...drape([[33.2, -112.8]], bbox, terrain, 0.4)[0]] as [number, number, number]} center distanceFactor={22}>
        <div
          style={{
            padding: '2px 8px',
            fontSize: 10,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#333',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderRadius: 3,
            letterSpacing: 1,
            whiteSpace: 'nowrap',
          }}
        >
          ARIZONA
        </div>
      </Html>
    </group>
  )
}

/* -------------------------------- Highways -------------------------------- */

function HighwayOverlay({
  bbox,
  terrain,
}: {
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  return (
    <group>
      {HIGHWAYS.map((h) => (
        <Line
          key={h.name}
          points={drape(h.points, bbox, terrain, 0.06)}
          color="#f5d76e"
          lineWidth={1.8}
          transparent
          opacity={0.9}
        />
      ))}
    </group>
  )
}

/* --------------------------------- Rivers --------------------------------- */

function RiverOverlay({
  bbox,
  terrain,
}: {
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  return (
    <group>
      {RIVERS.map((r) => (
        <Line
          key={r.name}
          points={drape(r.points, bbox, terrain, 0.04)}
          color="#4a8fb5"
          lineWidth={1.4}
          transparent
          opacity={0.85}
        />
      ))}
    </group>
  )
}

/* ------------------------ MRDS mineral occurrences ------------------------ */
//
// Renders every MRDS deposit point as a tiny instanced dot colored by the
// first-listed commodity. 8k+ points at once are fine via InstancedMesh —
// GPU uploads one geometry + one per-instance matrix/color attribute.

const _COMMODITY_COLOR: Record<string, string> = {
  CU: '#d45d2a', // copper
  MO: '#8a7046', // molybdenum
  AU: '#e0a030', // gold
  AG: '#c0c0c0', // silver
  PB: '#50475a', // lead
  ZN: '#7a8fa8', // zinc
  FE: '#95432b', // iron
  U: '#5a8f6a', // uranium
  W: '#6a6a9a', // tungsten
  MN: '#9a5a7a', // manganese
  F: '#7aa89a',
  BA: '#a890a8',
  NI: '#5aa0aa',
  SN: '#aa8f5a',
}
const _DEFAULT_OCC_COLOR = '#6c7b9a'

function occurrenceColor(commodities: string): THREE.Color {
  const first = commodities.trim().split(/\s+/)[0]?.toUpperCase() ?? ''
  return new THREE.Color(_COMMODITY_COLOR[first] ?? _DEFAULT_OCC_COLOR)
}

function MrdsOccurrences({
  occurrences,
  bbox,
  terrain,
}: {
  occurrences: MrdsOccurrence[]
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Shared geometry + material — one draw call for all 8k+ points.
  const init = useMemo(
    () => ({
      geom: new THREE.SphereGeometry(0.055, 8, 8),
      mat: new THREE.MeshBasicMaterial({ toneMapped: false }),
    }),
    [],
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    let k = 0
    for (const o of occurrences) {
      if (o.lon < bbox[0] || o.lon > bbox[2] || o.lat < bbox[1] || o.lat > bbox[3]) continue
      const { x, z } = geoToScenePlanar(o.lon, o.lat, bbox)
      const y = sceneY(sampleTerrainElevation(o.lon, o.lat, terrain, bbox)) + 0.04
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      mesh.setMatrixAt(k, dummy.matrix)
      color.copy(occurrenceColor(o.commodities))
      mesh.setColorAt(k, color)
      k += 1
    }
    mesh.count = k
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [occurrences, bbox, terrain])

  return (
    <instancedMesh
      ref={meshRef}
      args={[init.geom, init.mat, Math.max(1, occurrences.length)]}
      frustumCulled={false}
    />
  )
}

/* ------------------------------ City markers ------------------------------ */

function CityMarkers({
  bbox,
  terrain,
}: {
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
}) {
  return (
    <group>
      {REFERENCE_CITIES.map((c) => {
        const [minLon, minLat, maxLon, maxLat] = bbox
        if (c.lon < minLon || c.lon > maxLon || c.lat < minLat || c.lat > maxLat) return null
        const { x, z } = geoToScenePlanar(c.lon, c.lat, bbox)
        const y = sceneY(sampleTerrainElevation(c.lon, c.lat, terrain, bbox))
        const r = c.rank === 'major' ? 0.24 : 0.14
        return (
          <group key={c.name} position={[x, y, z]}>
            <mesh position={[0, 0.08, 0]}>
              <cylinderGeometry args={[r, r, 0.05, 24]} />
              <meshStandardMaterial color="#1d1d1f" emissive="#0b0b0b" emissiveIntensity={0.2} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <sphereGeometry args={[r * 0.78, 20, 20]} />
              <meshStandardMaterial color="#ffffff" emissive="#d5dde8" emissiveIntensity={0.3} />
            </mesh>
            <Html position={[0, 0.55, 0]} center distanceFactor={26} style={{ pointerEvents: 'none' }}>
              <div
                style={{
                  padding: c.rank === 'major' ? '2px 8px' : '1px 6px',
                  fontSize: c.rank === 'major' ? 12 : 10,
                  fontWeight: c.rank === 'major' ? 700 : 600,
                  fontFamily: 'Inter, sans-serif',
                  color: '#111',
                  background: 'rgba(255,255,255,0.94)',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderRadius: 3,
                  whiteSpace: 'nowrap',
                  letterSpacing: 0.2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }}
              >
                {c.name}
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

/* ------------------------------ Drill Holes ------------------------------- */

function DrillHoleMesh({
  hole,
  bbox,
  terrain,
  isHighlighted,
}: {
  hole: DrillHole
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
  isHighlighted: boolean
}) {
  const { collar, intervals, axis } = useMemo(() => {
    const { x, z } = geoToScenePlanar(hole.lon, hole.lat, bbox)
    const y = sceneY(sampleTerrainElevation(hole.lon, hole.lat, terrain, bbox))
    const p = new THREE.Vector3(x, y + 0.05, z)
    const az = THREE.MathUtils.degToRad(hole.azimuth_deg)
    // dip is negative (e.g. -75°) meaning 75° below horizontal.
    const inclFromVert = THREE.MathUtils.degToRad(Math.abs(hole.dip_deg))
    const dir = new THREE.Vector3(
      Math.sin(az) * Math.sin(THREE.MathUtils.degToRad(90) - inclFromVert) * -1,
      -Math.cos(THREE.MathUtils.degToRad(90) - inclFromVert),
      Math.cos(az) * Math.sin(THREE.MathUtils.degToRad(90) - inclFromVert) * -1,
    ).normalize()

    // Scale factor: 1 scene unit ≈ 480 m laterally (SCENE_W/4°≈111 km ÷ 48),
    // but elevation uses a 5× exaggeration. We visualize drill holes in
    // "vertical scene-units per meter" so 1200 m hole reads as ~3 units —
    // tall enough to be legible next to deposit markers at any zoom.
    const scale = 0.0025

    const meshes = hole.intervals.map((iv) => {
      const start = p.clone().add(dir.clone().multiplyScalar(iv.from_m * scale))
      const end = p.clone().add(dir.clone().multiplyScalar(iv.to_m * scale))
      const mid = start.clone().lerp(end, 0.5)
      const len = start.distanceTo(end)
      return { mid, len, from: iv.from_m, cu: iv.cu_pct, start, end }
    })
    const totalEnd = p.clone().add(dir.clone().multiplyScalar(hole.total_depth_m * scale))
    return { collar: p, intervals: meshes, axis: { start: p, end: totalEnd, dir } }
  }, [hole, bbox, terrain])

  // Orient each interval cylinder along the hole direction.
  const quat = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.dir)
    return q
  }, [axis.dir])

  return (
    <group>
      {/* Collar — small pin at surface */}
      <mesh position={collar.toArray()} castShadow>
        <sphereGeometry args={[isHighlighted ? 0.18 : 0.1, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#d45d2a"
          emissiveIntensity={isHighlighted ? 0.8 : 0.25}
        />
      </mesh>
      {/* Full trace: a thin dark guide line so the hole reads even at overview zoom. */}
      <mesh
        position={axis.start.clone().lerp(axis.end, 0.5).toArray()}
        quaternion={quat}
      >
        <cylinderGeometry
          args={[
            isHighlighted ? 0.025 : 0.018,
            isHighlighted ? 0.025 : 0.018,
            axis.start.distanceTo(axis.end),
            6,
          ]}
        />
        <meshBasicMaterial color="#2a1a08" transparent opacity={0.8} />
      </mesh>
      {/* Grade intervals — color-coded fat cylinders */}
      {intervals.map((iv, i) => (
        <mesh key={i} position={iv.mid.toArray()} quaternion={quat}>
          <cylinderGeometry
            args={[
              isHighlighted ? 0.14 : 0.09,
              isHighlighted ? 0.14 : 0.09,
              iv.len,
              10,
            ]}
          />
          <meshStandardMaterial
            color={gradeColor(iv.cu)}
            emissive={gradeColor(iv.cu)}
            emissiveIntensity={iv.cu > 0.3 ? 0.7 : 0.15}
            roughness={0.4}
            metalness={0.25}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ----------------------------- Deposit markers ---------------------------- */

function DepositMarker({
  deposit,
  bbox,
  terrain,
  selected,
  showLabel,
  onSelect,
}: {
  deposit: Deposit
  bbox: [number, number, number, number]
  terrain: TerrainPayload | null
  selected: boolean
  showLabel: boolean
  onSelect: () => void
}) {
  const p = useMemo(() => {
    const { x, z } = geoToScenePlanar(deposit.lon, deposit.lat, bbox)
    const y = sceneY(sampleTerrainElevation(deposit.lon, deposit.lat, terrain, bbox))
    return new THREE.Vector3(x, y, z)
  }, [deposit, bbox, terrain])

  const sizeMap: Record<Deposit['size_class'], number> = {
    small: 0.55,
    medium: 0.75,
    large: 1.0,
    giant: 1.35,
  }
  const baseR = sizeMap[deposit.size_class] * (selected ? 1.6 : 1.0)

  const ringRef = useRef<THREE.Mesh>(null)
  const pinRef = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (ringRef.current) {
      const pulse = 1 + Math.sin(t * (selected ? 2.8 : 1.6) + deposit.lon) * 0.1
      ringRef.current.scale.set(pulse, pulse, pulse)
    }
    if (pinRef.current) {
      pinRef.current.position.y = p.y + 0.8 + Math.sin(t * 1.6 + deposit.lat) * 0.05
    }
  })

  const [hovered, setHovered] = useState(false)

  return (
    <group position={p.toArray()}>
      {/* Flat pulsing ring on terrain */}
      <mesh
        ref={ringRef}
        position={[0, 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <ringGeometry args={[baseR * 0.85, baseR, 48]} />
        <meshBasicMaterial
          color={selected ? '#ea001e' : '#d45d2a'}
          transparent
          opacity={selected ? 0.95 : 0.8}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* Vertical beacon stem */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.0, 8]} />
        <meshBasicMaterial color={selected ? '#ea001e' : '#d45d2a'} toneMapped={false} />
      </mesh>
      {/* Floating pin sphere */}
      <group ref={pinRef}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
        >
          <sphereGeometry args={[0.26, 24, 24]} />
          <meshStandardMaterial
            color="#d45d2a"
            emissive="#d45d2a"
            emissiveIntensity={selected ? 1.4 : 0.7}
            toneMapped={false}
          />
        </mesh>
        <PulseRing baseR={baseR * 1.2} selected={selected} depositHash={deposit.lon} />
      </group>
      {showLabel && (
        <Html
          position={[0, 1.4, 0]}
          center
          distanceFactor={18}
          occlude={false}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            style={{
              whiteSpace: 'nowrap',
              padding: '3px 9px',
              fontFamily: 'Inter, sans-serif',
              fontSize: selected || hovered ? 13 : 11,
              fontWeight: selected ? 700 : 600,
              color: selected ? '#fff' : 'var(--text-primary)',
              background: selected
                ? 'rgba(234, 0, 30, 0.95)'
                : hovered
                  ? 'rgba(212, 93, 42, 0.95)'
                  : 'rgba(255,255,255,0.96)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.22)',
              letterSpacing: 0.1,
              transition: 'all 150ms ease',
            }}
          >
            {deposit.name}
            {selected && (
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  opacity: 0.9,
                  fontFamily: 'JetBrains Mono, monospace',
                  marginTop: 1,
                }}
              >
                {deposit.owner} ·{' '}
                {deposit.prospectivity !== undefined ? (deposit.prospectivity * 100).toFixed(0) + '%' : ''}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  )
}

function PulseRing({
  baseR,
  selected,
  depositHash,
}: {
  baseR: number
  selected: boolean
  depositHash: number
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.getElapsedTime() * (selected ? 0.9 : 0.45) + depositHash) % 2
    const scale = 0.9 + t * 0.8
    ref.current.scale.set(scale, scale, scale)
    const m = ref.current.material as THREE.MeshBasicMaterial
    m.opacity = Math.max(0, 0.4 - t * 0.2)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[baseR * 1.05, baseR * 1.22, 48]} />
      <meshBasicMaterial
        color={selected ? '#ea001e' : '#d45d2a'}
        transparent
        opacity={0.3}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  )
}
