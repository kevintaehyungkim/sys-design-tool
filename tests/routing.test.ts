import { describe, expect, it } from 'vitest'
import { exampleDocument } from '../src/example'
import { crosses, routeEdge, roundedPath } from '../src/routing'
describe('orthogonal routing', () => {
  it('routes every example connection without crossing any component interior', () => {
    const doc = exampleDocument()
    for (const edge of doc.edges) {
      const points = routeEdge(edge, doc.nodes, doc.edges)
      expect(points, edge.id).not.toBeNull()
      for (let i = 1; i < points!.length; i++) {
        const a = points![i - 1],
          b = points![i]
        expect(a.x === b.x || a.y === b.y).toBe(true)
        for (const node of doc.nodes)
          expect(
            crosses(a, b, node),
            `${edge.sourceId} → ${edge.targetId} crosses ${node.name}`,
          ).toBe(false)
      }
      expect(roundedPath(points!)).toMatch(/^M /)
    }
  })
  it('separates parallel modes and routes reverse connections', () => {
    const doc = exampleDocument(),
      first = doc.edges[3],
      async = { ...first, id: 'async', mode: 'async' as const },
      reverse = { ...first, id: 'reverse', sourceId: first.targetId, targetId: first.sourceId }
    const edges = [...doc.edges, async, reverse],
      a = routeEdge(first, doc.nodes, edges),
      b = routeEdge(async, doc.nodes, edges),
      c = routeEdge(reverse, doc.nodes, edges)
    expect(a).not.toBeNull()
    expect(b).not.toEqual(a)
    expect(c).not.toBeNull()
  })
  it('reports an unresolved route for fully overlapping components', () => {
    const doc = exampleDocument()
    doc.nodes[1] = {
      ...doc.nodes[1],
      ...{
        x: doc.nodes[0].x,
        y: doc.nodes[0].y,
        width: doc.nodes[0].width,
        height: doc.nodes[0].height,
      },
    }
    // Identical boxes have no meaningful source/target route; overlapping endpoints are rejected.
    expect(routeEdge(doc.edges[0], doc.nodes, doc.edges)).toBeNull()
  })
})

it('routes a 30-component graph without crossing unrelated cards', () => {
  const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, kind: 'service' as const, name: `Service ${i}`, description: '', x: (i % 5) * 340, y: Math.floor(i / 5) * 180, width: 240, height: 100 }))
  const edges = nodes.slice(1).map((n, i) => ({ id: `e${i}`, sourceId: nodes[i].id, targetId: n.id, mode: 'sync' as const, label: '' }))
  for (const edge of edges) {
    const points = routeEdge(edge, nodes, edges)
    expect(points, edge.id).not.toBeNull()
    for (let i = 1; i < points!.length; i++) for (const n of nodes) expect(crosses(points![i - 1], points![i], n), `${edge.id} crossing ${n.id}`).toBe(false)
  }
})
