// Marching-squares contour extraction on an elevation grid.
//
// Returns an array of open polylines (pairs of points) per contour level —
// grouped rather than chained because linking segments into continuous lines
// requires O(n log n) bookkeeping that is visually indistinguishable at this
// zoom level. Two short segments draw identically to one long polyline when
// rendered as a LineSegments mesh.

export interface ContourSegment {
  elevation: number
  // Each pair of points = one line segment: [x0,y0, x1,y1, ...] in grid space.
  segments: number[]
}

export function marchingSquares(
  elevation: number[],
  width: number,
  height: number,
  levels: number[],
): ContourSegment[] {
  const out: ContourSegment[] = []
  for (const level of levels) {
    const segs: number[] = []
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = elevation[y * width + x]
        const tr = elevation[y * width + x + 1]
        const br = elevation[(y + 1) * width + x + 1]
        const bl = elevation[(y + 1) * width + x]

        let idx = 0
        if (tl >= level) idx |= 1
        if (tr >= level) idx |= 2
        if (br >= level) idx |= 4
        if (bl >= level) idx |= 8

        if (idx === 0 || idx === 15) continue

        // Interpolated crossings on each of the 4 edges.
        const top = [x + interp(tl, tr, level), y]
        const right = [x + 1, y + interp(tr, br, level)]
        const bottom = [x + interp(bl, br, level), y + 1]
        const left = [x, y + interp(tl, bl, level)]

        const push = (a: number[], b: number[]) => {
          segs.push(a[0], a[1], b[0], b[1])
        }

        switch (idx) {
          case 1:
          case 14:
            push(top, left)
            break
          case 2:
          case 13:
            push(top, right)
            break
          case 4:
          case 11:
            push(bottom, right)
            break
          case 8:
          case 7:
            push(bottom, left)
            break
          case 3:
          case 12:
            push(left, right)
            break
          case 6:
          case 9:
            push(top, bottom)
            break
          case 5:
            push(top, left)
            push(bottom, right)
            break
          case 10:
            push(top, right)
            push(bottom, left)
            break
        }
      }
    }
    out.push({ elevation: level, segments: segs })
  }
  return out
}

function interp(a: number, b: number, level: number): number {
  if (a === b) return 0.5
  return Math.max(0, Math.min(1, (level - a) / (b - a)))
}
