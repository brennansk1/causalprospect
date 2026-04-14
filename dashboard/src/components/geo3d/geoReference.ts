// Reference geography for the Arizona study area — lets recruiters anchor
// the 3D scene to real places they recognize. All coordinates are WGS84.

export interface City {
  name: string
  lat: number
  lon: number
  population: number
  rank: 'major' | 'minor'
}

/** Cities within or near the AZ porphyry belt bbox (-113..-109, 31..34.5). */
export const REFERENCE_CITIES: City[] = [
  { name: 'Phoenix', lat: 33.4484, lon: -112.074, population: 1650000, rank: 'major' },
  { name: 'Tucson', lat: 32.2226, lon: -110.9747, population: 545000, rank: 'major' },
  { name: 'Mesa', lat: 33.4152, lon: -111.8315, population: 510000, rank: 'major' },
  { name: 'Chandler', lat: 33.3062, lon: -111.8413, population: 275000, rank: 'minor' },
  { name: 'Scottsdale', lat: 33.4942, lon: -111.9261, population: 240000, rank: 'minor' },
  { name: 'Nogales', lat: 31.3404, lon: -110.9343, population: 20000, rank: 'minor' },
  { name: 'Casa Grande', lat: 32.8795, lon: -111.7574, population: 60000, rank: 'minor' },
  { name: 'Safford', lat: 32.8339, lon: -109.7075, population: 9500, rank: 'minor' },
  { name: 'Globe', lat: 33.3942, lon: -110.7865, population: 7500, rank: 'minor' },
  { name: 'Sierra Vista', lat: 31.5455, lon: -110.2773, population: 45000, rank: 'minor' },
]

/** Interstate polylines approximated by their anchor cities — enough to
 *  orient a recruiter without fetching full TIGER/Line shapefiles. */
export const HIGHWAYS: { name: string; points: [number, number][] }[] = [
  // I-10: Phoenix → Tucson → Benson → NM
  {
    name: 'I-10',
    points: [
      [33.4484, -112.074],
      [33.0, -111.5],
      [32.7, -111.2],
      [32.2226, -110.9747],
      [31.95, -110.3],
      [31.85, -109.5],
      [31.86, -109.0],
    ],
  },
  // I-17: Phoenix → Camp Verde → Flagstaff (north edge)
  {
    name: 'I-17',
    points: [
      [33.4484, -112.074],
      [34.0, -112.1],
      [34.5, -111.9],
    ],
  },
  // I-8: Yuma → Casa Grande → Tucson
  {
    name: 'I-8',
    points: [
      [32.87, -113.0],
      [32.88, -112.0],
      [32.88, -111.76],
    ],
  },
  // I-19: Tucson → Nogales
  {
    name: 'I-19',
    points: [
      [32.2226, -110.9747],
      [31.9, -110.97],
      [31.6, -110.98],
      [31.3404, -110.9343],
    ],
  },
  // US-60: Phoenix → Globe → Safford
  {
    name: 'US-60',
    points: [
      [33.4484, -112.074],
      [33.42, -111.5],
      [33.4, -111.0],
      [33.39, -110.79],
      [33.15, -110.3],
      [32.95, -109.95],
      [32.8339, -109.7075],
    ],
  },
]

/** Arizona-Mexico border (simplified Natural Earth polyline, AZ segment). */
export const MEXICO_BORDER: [number, number][] = [
  [31.3331, -114.8195],
  [31.3328, -114.0],
  [31.3323, -113.5],
  [31.3331, -113.1039], // Lukeville
  [31.334, -112.5],
  [31.3312, -112.0],
  [31.3295, -111.3],
  [31.332, -111.08],
  [31.333, -110.9343], // Nogales
  [31.332, -110.5],
  [31.333, -110.0],
  [31.333, -109.5],
  [31.333, -109.05], // AZ-NM corner
]

/** Arizona-New Mexico state border (eastern edge of bbox, N-S). */
export const NM_BORDER: [number, number][] = [
  [31.333, -109.045],
  [32.0, -109.045],
  [33.0, -109.045],
  [34.5, -109.045],
]

/** Approximate NW arc of AZ state boundary within bbox (clipped at top-left). */
export const AZ_WEST_BORDER: [number, number][] = [
  [34.5, -114.0],
  [34.0, -114.3],
  [33.5, -114.6],
  [33.0, -114.7],
  [32.5, -114.82],
  [32.0, -114.82],
  [31.7, -114.82],
  [31.45, -114.82],
  [31.333, -114.82],
]

/** Major rivers as visible anchors (simplified). */
export const RIVERS: { name: string; points: [number, number][] }[] = [
  {
    name: 'Gila River',
    points: [
      [32.72, -114.6],
      [32.8, -113.3],
      [32.9, -112.5],
      [33.0, -112.0],
      [33.2, -111.1],
      [33.0, -110.5],
      [32.9, -109.8],
    ],
  },
  {
    name: 'Salt River',
    points: [
      [33.43, -112.15],
      [33.56, -111.8],
      [33.65, -111.3],
      [33.65, -110.9],
      [33.82, -110.6],
    ],
  },
  {
    name: 'Colorado River (AZ boundary)',
    points: [
      [34.5, -114.3],
      [34.0, -114.4],
      [33.0, -114.7],
      [32.7, -114.7],
    ],
  },
]
