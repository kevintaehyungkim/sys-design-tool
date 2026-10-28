import { describe, expect, it } from 'vitest'
import {
  blankDocument,
  emptyText,
  connectionError,
  fromPlainText,
  minNodeHeight,
  parseDocument,
  removeNode,
  resizeNode,
  textRuns,
  type Component,
  type ResizeDirection,
} from '../src/model'
import { exampleDocument } from '../src/example'
import { commit, initialHistory, redo, undo } from '../src/history'
const node: Component = {
  id: 'a',
  kind: 'service',
  name: 'Service',
  description: 'A description',
  x: 100,
  y: 200,
  width: 280,
  height: 140,
}
describe('document integrity', () => {
  it('round trips all example sections and graph references', () => {
    const doc = exampleDocument()
    expect(parseDocument(JSON.parse(JSON.stringify(doc)))).toEqual(doc)
    expect(parseDocument(blankDocument()).pages).toHaveLength(1)
  })
  it('resets all authored content and layout, with keyboard recovery available', () => {
    const original = exampleDocument()
    original.requirements.columns = 1
    original.activePageId = 'data-model'
    const reset = commit(initialHistory(original), blankDocument())
    const doc = reset.present
    expect(doc.id).not.toBe(original.id)
    expect(doc.title).toBe('')
    expect(doc.requirements.heading).toBe('Goal')
    expect(doc.requirements.intro).toBe('')
    expect(doc.requirements.columns).toBe(2)
    for (const section of Object.values(doc.requirements.sections))
      expect(section).toEqual(emptyText())
    expect(doc.approach.content).toEqual(emptyText())
    expect(doc.nodes).toEqual([])
    expect(doc.edges).toEqual([])
    expect(doc.pages).toEqual([{ id: 'general', title: 'GENERAL', content: emptyText() }])
    expect(doc.activePageId).toBe('general')
    expect(doc.viewport).toEqual({ x: 40, y: 40, zoom: 1 })
    expect(undo(reset).present).toEqual(original)
  })
  it('migrates old named sections without losing lists, code or custom headings', () => {
    const heading = (text: string) => ({
      type: 'heading',
      attrs: { level: 3 },
      content: textRuns(text),
    })
    const old = {
      ...exampleDocument(),
      schemaVersion: 1,
      requirements: {
        heading: 'Requirements',
        intro: 'Existing goal',
        columns: 1,
        groups: [
          {
            type: 'doc',
            content: [
              heading('Functional'),
              ...fromPlainText('- Keep `POST /links`').content!,
              heading('Assumptions'),
              ...fromPlainText('- Original idea').content!,
            ],
          },
          {
            type: 'doc',
            content: [
              heading('Guarantees'),
              ...fromPlainText('- Durable writes').content!,
              heading('Scale / Constraints'),
              heading('Capacity notes'),
              ...fromPlainText('- 10M/day').content!,
            ],
          },
        ],
      },
    }
    const snapshot = structuredClone(old)
    const migrated = parseDocument(old)
    expect(old).toEqual(snapshot)
    expect(migrated.schemaVersion).toBe(2)
    expect(migrated.requirements.heading).toBe('Goal')
    expect(migrated.requirements.intro).toBe('Existing goal')
    expect(migrated.requirements.columns).toBe(1)
    expect(migrated.requirements.sections.requirements).toEqual(
      fromPlainText('- Keep `POST /links`'),
    )
    expect(migrated.requirements.sections.keyIdeas).toEqual(fromPlainText('- Original idea'))
    expect(migrated.requirements.sections.guarantees).toEqual(fromPlainText('- Durable writes'))
    expect(migrated.requirements.sections.scaleConstraints.content).toEqual([
      heading('Capacity notes'),
      ...fromPlainText('- 10M/day').content!,
    ])
    expect(migrated.nodes).toEqual(old.nodes)
    expect(migrated.pages).toEqual(old.pages)
    expect(parseDocument(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated)
  })
  it('keeps mixed legacy scale/guarantee text together instead of guessing its meaning', () => {
    const mixed = fromPlainText('- 10M/day\n- Always durable\nCustom prose')
    const migrated = parseDocument({
      ...blankDocument(),
      schemaVersion: 1,
      requirements: {
        heading: 'Custom goal',
        intro: '',
        columns: 2,
        groups: [
          fromPlainText('Left prose'),
          {
            type: 'doc',
            content: [
              { type: 'heading', attrs: { level: 3 }, content: textRuns('Scale & guarantees') },
              ...mixed.content!,
            ],
          },
        ],
      },
    })
    expect(migrated.requirements.heading).toBe('Custom goal')
    expect(migrated.requirements.sections.requirements).toEqual(fromPlainText('Left prose'))
    expect(migrated.requirements.sections.guarantees).toEqual(mixed)
    expect(migrated.requirements.sections.scaleConstraints).toEqual(emptyText())
  })
  it('rejects missing or unsafe content in every new framing section', () => {
    for (const key of Object.keys(blankDocument().requirements.sections)) {
      const doc = blankDocument()
      delete (doc.requirements.sections as Record<string, unknown>)[key]
      expect(() => parseDocument(doc)).toThrow()
      ;(doc.requirements.sections as Record<string, unknown>)[key] = { type: 'script' }
      expect(() => parseDocument(doc)).toThrow()
    }
  })
  it('rejects unsafe text, dangling edges, duplicate names and invalid dimensions', () => {
    const unsafe = exampleDocument()
    unsafe.approach.content = { type: 'doc', content: [{ type: 'script', text: 'bad' }] }
    expect(() => parseDocument(unsafe)).toThrow()
    const dangling = exampleDocument()
    dangling.edges[0].targetId = 'missing'
    expect(() => parseDocument(dangling)).toThrow(/connection/)
    const duplicate = exampleDocument()
    duplicate.nodes[1].name = duplicate.nodes[0].name.toUpperCase()
    expect(() => parseDocument(duplicate)).toThrow(/name/)
    const dimensions = exampleDocument()
    dimensions.nodes[0].width = NaN
    expect(() => parseDocument(dimensions)).toThrow(/dimensions/)
  })
  it('deletes a component and its edges as one reversible command', () => {
    const doc = exampleDocument(),
      before = initialHistory(doc),
      after = commit(before, removeNode(doc, 'redirect'))
    expect(
      after.present.edges.every((e) => e.sourceId !== 'redirect' && e.targetId !== 'redirect'),
    ).toBe(true)
    expect(undo(after).present).toEqual(doc)
    expect(redo(undo(after)).present).toEqual(after.present)
  })
  it('coalesces typing without merging a later gesture', () => {
    const doc = blankDocument()
    let h = initialHistory(doc)
    h = commit(h, { ...h.present, title: 'a' }, 'title', 100)
    h = commit(h, { ...h.present, title: 'ab' }, 'title', 300)
    expect(h.past).toHaveLength(1)
    h = commit(h, { ...h.present, title: 'abc' }, 'title', 1500)
    expect(h.past).toHaveLength(2)
    h = commit(h, { ...h.present, nodes: [node] })
    expect(h.past).toHaveLength(3)
  })
  it('rejects self and duplicate connections, permits reverse and async variants', () => {
    const d = exampleDocument(),
      e = d.edges[0]
    expect(connectionError(e, d.nodes, d.edges)).toMatch(/already/)
    expect(connectionError({ ...e, targetId: e.sourceId }, d.nodes, d.edges)).toMatch(/different/)
    expect(connectionError({ ...e, mode: 'async' }, d.nodes, d.edges)).toBe('')
    expect(
      connectionError({ ...e, sourceId: e.targetId, targetId: e.sourceId }, d.nodes, d.edges),
    ).toBe('')
  })
})
describe('resize geometry', () => {
  for (const direction of ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as ResizeDirection[])
    it(`anchors the opposite side when resizing ${direction}`, () => {
      const result = resizeNode(node, direction, 25, 18)
      if (direction.includes('w')) expect(result.x + result.width).toBe(node.x + node.width)
      else expect(result.x).toBe(node.x)
      if (direction.includes('n')) expect(result.y + result.height).toBe(node.y + node.height)
      else expect(result.y).toBe(node.y)
      expect(result.width).toBe(direction.includes('e') ? 305 : direction.includes('w') ? 255 : 280)
      expect(result.height).toBe(
        direction.includes('s') ? 158 : direction.includes('n') ? 122 : 140,
      )
    })
  it('accounts for word wrapping rather than only total character width', () => {
    const n = { ...node, description: Array(12).fill('representation').join(' ') }
    expect(minNodeHeight(n, 190)).toBeGreaterThanOrEqual(32 + 24 + 7 + 12 * 20)
  })
  it('keeps long text readable when width is reduced', () => {
    const n = { ...node, description: 'A long description '.repeat(20) },
      r = resizeNode(n, 'nw', 1000, 1000)
    expect(r.width).toBe(190)
    expect(r.height).toBeGreaterThanOrEqual(minNodeHeight(n, 190))
    expect(r.x + r.width).toBe(380)
  })
})
describe('pasted text', () => {
  it('groups dash bullets without converting internal hyphens or uppercase body', () => {
    const rich = fromPlainText('NOT A HEADING\n- Read `short-code`\n- cache-aside\nNegative -5')
    expect(rich.content!.map((x) => x.type)).toEqual(['paragraph', 'bulletList', 'paragraph'])
    expect(rich.content![1].content).toHaveLength(2)
    expect(rich.content![1].content![0].content![0].content![1].marks).toEqual([{ type: 'code' }])
  })
  it('keeps unmatched, empty, escaped and fenced backticks literal', () => {
    for (const text of ['`unclosed', '``', '\\`literal`', '`literal\\`', '```fenced```'])
      expect(textRuns(text)).toEqual([{ type: 'text', text }])
    expect(textRuns('a `one` b `two`').filter((r) => r.marks)).toHaveLength(2)
  })
})
