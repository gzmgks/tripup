import { useMemo } from 'react'

const N = 25

/** Three finder squares in the corners, like a real QR code. */
function inFinder(x: number, y: number): boolean | null {
  for (const [ox, oy] of [
    [0, 0],
    [N - 7, 0],
    [0, N - 7],
  ]) {
    const dx = x - ox
    const dy = y - oy
    if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
      if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return false // quiet ring
      const edge = dx === 0 || dy === 0 || dx === 6 || dy === 6
      const core = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
      return edge || core
    }
  }
  return null
}

/** Deterministic modules from the link text (a stand-in, not a scannable code). */
function modules(seed: string): [number, number][] {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  const next = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return (h >>> 0) / 4294967296
  }
  const out: [number, number][] = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const f = inFinder(x, y)
      if (f === true || (f === null && next() < 0.48)) out.push([x, y])
    }
  }
  return out
}

/** "Show QR code" (03): a simple QR-like placeholder for the guest link. */
export function QrPlaceholder({ link, size }: { link: string; size: number }) {
  const cells = useMemo(() => modules(link), [link])
  return (
    <svg width={size} height={size} viewBox={`0 0 ${N} ${N}`} role="img" aria-label={`QR code for ${link}`} shapeRendering="crispEdges">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" />
      ))}
    </svg>
  )
}
