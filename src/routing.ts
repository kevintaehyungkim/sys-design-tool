import type { Component, Connection, Rect } from './model'
export interface Point {
  x: number
  y: number
}
const clearance = 18
const expand = (n: Rect): Rect => ({
  x: n.x - clearance,
  y: n.y - clearance,
  width: n.width + clearance * 2,
  height: n.height + clearance * 2,
})
export function crosses(a: Point, b: Point, r: Rect) {
  if (a.x === b.x)
    return (
      a.x > r.x &&
      a.x < r.x + r.width &&
      Math.max(a.y, b.y) > r.y &&
      Math.min(a.y, b.y) < r.y + r.height
    )
  return (
    a.y > r.y &&
    a.y < r.y + r.height &&
    Math.max(a.x, b.x) > r.x &&
    Math.min(a.x, b.x) < r.x + r.width
  )
}
const inside = (p: Point, r: Rect) =>
  p.x > r.x && p.x < r.x + r.width && p.y > r.y && p.y < r.y + r.height
const distance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
function ports(n: Component, other: Component, offset: number) {
  const x = Math.max(
    n.x + 8,
    Math.min(
      n.x + n.width - 8,
      Math.max(n.x + 36, Math.min(n.x + n.width - 36, other.x + other.width / 2)) + offset,
    ),
  )
  const y = Math.max(
    n.y + 8,
    Math.min(
      n.y + n.height - 8,
      Math.max(n.y + 36, Math.min(n.y + n.height - 36, other.y + other.height / 2)) + offset,
    ),
  )
  return [
    [
      { x, y: n.y },
      { x, y: n.y - clearance - 2 },
    ],
    [
      { x: n.x + n.width, y },
      { x: n.x + n.width + clearance + 2, y },
    ],
    [
      { x, y: n.y + n.height },
      { x, y: n.y + n.height + clearance + 2 },
    ],
    [
      { x: n.x, y },
      { x: n.x - clearance - 2, y },
    ],
  ]
}
class Heap {
  values: { key: number; score: number }[] = []
  push(key: number, score: number) {
    const a = this.values
    a.push({ key, score })
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].score <= score) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.values,
      first = a[0],
      last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      while (true) {
        let c = i * 2 + 1
        if (c >= a.length) break
        if (c + 1 < a.length && a[c + 1].score < a[c].score) c++
        if (a[i].score <= a[c].score) break
        ;[a[c], a[i]] = [a[i], a[c]]
        i = c
      }
    }
    return first
  }
}
function gridRoute(start: Point, end: Point, obstacles: Rect[]): Point[] | null {
  if (obstacles.some((r) => inside(start, r) || inside(end, r))) return null
  const xs = [...new Set([start.x, end.x, ...obstacles.flatMap((r) => [r.x, r.x + r.width])])].sort(
    (a, b) => a - b,
  )
  const ys = [
    ...new Set([start.y, end.y, ...obstacles.flatMap((r) => [r.y, r.y + r.height])]),
  ].sort((a, b) => a - b)
  const width = xs.length,
    point = (i: number) => ({ x: xs[i % width], y: ys[Math.floor(i / width)] })
  const startI = ys.indexOf(start.y) * width + xs.indexOf(start.x),
    endI = ys.indexOf(end.y) * width + xs.indexOf(end.x)
  const heap = new Heap(),
    cost = new Map<number, number>(),
    parent = new Map<number, number>(),
    visited = new Set<number>()
  heap.push(startI * 3, distance(start, end))
  cost.set(startI * 3, 0)
  let found: number | undefined
  const clear = new Map<string, boolean>()
  while (heap.values.length) {
    const key = heap.pop().key
    if (visited.has(key)) continue
    visited.add(key)
    const index = Math.floor(key / 3),
      direction = key % 3,
      p = point(index)
    if (index === endI) {
      found = key
      break
    }
    const ix = index % width,
      iy = Math.floor(index / width)
    const neighbors = [
      ix > 0 ? index - 1 : -1,
      ix < width - 1 ? index + 1 : -1,
      iy > 0 ? index - width : -1,
      iy < ys.length - 1 ? index + width : -1,
    ]
    for (let d = 0; d < 4; d++) {
      const next = neighbors[d]
      if (next < 0) continue
      const q = point(next),
        segmentKey = `${Math.min(index, next)}:${Math.max(index, next)}`
      if (!clear.has(segmentKey))
        clear.set(segmentKey, !obstacles.some((r) => crosses(p, q, r) || inside(q, r)))
      if (!clear.get(segmentKey)) continue
      const nextDirection = d < 2 ? 1 : 2,
        nextKey = next * 3 + nextDirection
      const g =
        cost.get(key)! + distance(p, q) + (direction && direction !== nextDirection ? 28 : 0)
      if (g >= (cost.get(nextKey) ?? Infinity)) continue
      cost.set(nextKey, g)
      parent.set(nextKey, key)
      heap.push(nextKey, g + distance(q, end))
    }
  }
  if (found === undefined) return null
  const path: Point[] = []
  for (let key: number | undefined = found; key !== undefined; key = parent.get(key))
    path.push(point(Math.floor(key / 3)))
  return path.reverse()
}
export function simplify(points: Point[]) {
  const result: Point[] = []
  for (const p of points) {
    if (result.at(-1)?.x === p.x && result.at(-1)?.y === p.y) continue
    const a = result.at(-2),
      b = result.at(-1)
    if (a && b && ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y))) result.pop()
    result.push(p)
  }
  return result
}
export function routeEdge(
  edge: Connection,
  nodes: Component[],
  edges: Connection[],
): Point[] | null {
  const source = nodes.find((n) => n.id === edge.sourceId),
    target = nodes.find((n) => n.id === edge.targetId)
  if (!source || !target) return null
  if (
    source.x < target.x + target.width &&
    source.x + source.width > target.x &&
    source.y < target.y + target.height &&
    source.y + source.height > target.y
  )
    return null
  const offsetFor = (nodeId: string) => {
    const incident = edges.filter((e) => e.sourceId === nodeId || e.targetId === nodeId)
    return Math.max(
      -28,
      Math.min(28, (incident.findIndex((e) => e.id === edge.id) - (incident.length - 1) / 2) * 12),
    )
  }
  // Prefer the face toward the other component. Project onto wide gateway cards so
  // child services connect beneath their own position, rather than sharing one port.
  const preferred = (a: Component, b: Component) =>
    b.x >= a.x + a.width ? 1 : b.x + b.width <= a.x ? 3 : b.y >= a.y + a.height ? 2 : 0
  const sourcePorts = ports(source, target, offsetFor(source.id)),
    targetPorts = ports(target, source, offsetFor(target.id))
  const candidates = sourcePorts
    .flatMap((s, si) =>
      targetPorts.map((t, ti) => ({
        s,
        t,
        score:
          distance(s[1], t[1]) +
          (si === preferred(source, target) ? 0 : 120) +
          (ti === preferred(target, source) ? 0 : 120),
      })),
    )
    .sort((a, b) => a.score - b.score)
  const obstacles = nodes.map(expand)
  for (const { s, t } of candidates) {
    if (
      nodes.some((n) => n.id !== source.id && crosses(s[0], s[1], n)) ||
      nodes.some((n) => n.id !== target.id && crosses(t[0], t[1], n))
    )
      continue
    const route = gridRoute(s[1], t[1], obstacles)
    if (route) return simplify([s[0], ...route, t[0]])
  }
  return null
}
export function roundedPath(points: Point[], radius = 12) {
  if (!points.length) return ''
  let result = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1],
      b = points[i],
      c = points[i + 1],
      r = Math.min(radius, distance(a, b) / 2, distance(b, c) / 2)
    const before = { x: b.x + Math.sign(a.x - b.x) * r, y: b.y + Math.sign(a.y - b.y) * r }
    const after = { x: b.x + Math.sign(c.x - b.x) * r, y: b.y + Math.sign(c.y - b.y) * r }
    result += ` L ${before.x} ${before.y} Q ${b.x} ${b.y} ${after.x} ${after.y}`
  }
  const end = points.at(-1)!
  return `${result} L ${end.x} ${end.y}`
}
export function labelPoint(points: Point[]) {
  let length = -1,
    p = points[0]
  for (let i = 1; i < points.length; i++) {
    const d = distance(points[i - 1], points[i])
    if (d > length) {
      length = d
      p = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 }
    }
  }
  return p
}
export function regionBounds(nodes: Rect[], padding = 28): Rect {
  const x = Math.min(...nodes.map((n) => n.x)) - padding,
    y = Math.min(...nodes.map((n) => n.y)) - padding
  return {
    x,
    y,
    width: Math.max(...nodes.map((n) => n.x + n.width)) + padding - x,
    height: Math.max(...nodes.map((n) => n.y + n.height)) + padding - y,
  }
}
