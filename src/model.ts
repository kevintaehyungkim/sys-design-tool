import type { JSONContent } from '@tiptap/core'
export type RichText = JSONContent
export const emptyText = (): RichText => ({ type: 'doc', content: [{ type: 'paragraph' }] })
export const framingSections = {
  requirements: {
    title: 'REQUIREMENTS',
    color: '#7DB4F4',
    placeholder: 'What should the system do?',
  },
  keyIdeas: {
    title: 'KEY IDEAS',
    color: '#B99AE8',
    placeholder: 'Capture the ideas behind your design…',
  },
  guarantees: { title: 'GUARANTEES', color: '#81C784', placeholder: 'What must always hold true?' },
  scaleConstraints: {
    title: 'SCALE/CONSTRAINTS',
    color: '#E5B567',
    placeholder: 'Add traffic, storage, latency, or other constraints…',
  },
} as const
export type FramingKey = keyof typeof framingSections
export const framingColumns: FramingKey[][] = [
  ['requirements', 'keyIdeas'],
  ['guarantees', 'scaleConstraints'],
]
const emptyFraming = (): Record<FramingKey, RichText> => ({
  requirements: emptyText(),
  keyIdeas: emptyText(),
  guarantees: emptyText(),
  scaleConstraints: emptyText(),
})
export const palette = {
  client: {
    label: 'Client',
    group: 'Clients',
    accent: '#5E8FD6',
    top: '#122238',
    bottom: '#0A1422',
  },
  service: {
    label: 'Service',
    group: 'Serving plane',
    accent: '#8580C2',
    top: '#221A3A',
    bottom: '#1A142F',
  },
  data: {
    label: 'Data',
    group: 'Data stores',
    accent: '#5DCAA5',
    top: '#0A1F1C',
    bottom: '#040E0D',
  },
  cache: {
    label: 'Cache',
    group: 'Data stores',
    accent: '#63A860',
    top: '#161E15',
    bottom: '#080C08',
  },
  queue: {
    label: 'Events',
    group: 'Event processing',
    accent: '#BC77D4',
    top: '#331830',
    bottom: '#1F0A1D',
  },
  worker: {
    label: 'Worker',
    group: 'Event processing',
    accent: '#C65D7E',
    top: '#3B1B23',
    bottom: '#1A0A10',
  },
  control: {
    label: 'Control',
    group: 'Control plane',
    accent: '#E8A15C',
    top: '#231705',
    bottom: '#0D0702',
  },
  operations: {
    label: 'Control/Ops',
    group: 'Control/Ops',
    accent: '#7D7C78',
    top: '#20201E',
    bottom: '#121211',
  },
} as const
export type Kind = keyof typeof palette
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
export interface Component extends Rect {
  id: string
  kind: Kind
  name: string
  description: string
}
export interface Connection {
  id: string
  sourceId: string
  targetId: string
  mode: 'sync' | 'async'
  label: string
}
export interface Page {
  id: string
  title: string
  content: RichText
}
export interface Viewport {
  x: number
  y: number
  zoom: number
}
export interface DesignDocument {
  schemaVersion: 2
  id: string
  title: string
  updatedAt: string
  requirements: {
    heading: string
    columns: 1 | 2
    intro: string
    sections: Record<FramingKey, RichText>
  }
  approach: { heading: string; content: RichText }
  nodes: Component[]
  edges: Connection[]
  pages: Page[]
  activePageId: string
  viewport: Viewport
}
export const id = () => crypto.randomUUID()
export function blankDocument(): DesignDocument {
  return {
    schemaVersion: 2,
    id: id(),
    title: '',
    updatedAt: new Date().toISOString(),
    requirements: {
      heading: 'Goal',
      columns: 2,
      intro: '',
      sections: emptyFraming(),
    },
    approach: { heading: 'Design approach', content: emptyText() },
    nodes: [],
    edges: [],
    pages: [{ id: 'general', title: 'GENERAL', content: emptyText() }],
    activePageId: 'general',
    viewport: { x: 40, y: 40, zoom: 1 },
  }
}
export function uniqueName(base: string, existing: string[]) {
  const used = new Set(existing.map((n) => n.trim().toLocaleLowerCase()))
  if (!used.has(base.toLocaleLowerCase())) return base
  let i = 2
  while (used.has(`${base} ${i}`.toLocaleLowerCase())) i++
  return `${base} ${i}`
}
export function nameError(value: string, names: string[]) {
  if (!value.trim()) return 'Please enter a name.'
  if (names.some((n) => n.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase()))
    return 'That name is already in use.'
  return ''
}
export function connectionError(
  edge: Omit<Connection, 'id'>,
  nodes: Component[],
  edges: Connection[],
  editingId?: string,
) {
  if (!nodes.some((n) => n.id === edge.sourceId) || !nodes.some((n) => n.id === edge.targetId))
    return 'Choose two components.'
  if (edge.sourceId === edge.targetId) return 'Choose a different destination.'
  if (
    edges.some(
      (e) =>
        e.id !== editingId &&
        e.sourceId === edge.sourceId &&
        e.targetId === edge.targetId &&
        e.mode === edge.mode,
    )
  )
    return 'This connection already exists.'
  return ''
}
export function removeNode(doc: DesignDocument, nodeId: string): DesignDocument {
  return {
    ...doc,
    nodes: doc.nodes.filter((n) => n.id !== nodeId),
    edges: doc.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId),
  }
}
function lines(text: string, width: number, size: number) {
  const available = Math.max(1, width)
  const measure = (value: string) =>
    [...value].reduce((n, c) => n + (c.codePointAt(0)! > 255 ? size : size * 0.61), 0)
  return text.split('\n').reduce((total, line) => {
    let count = 1,
      used = 0
    for (const word of line.split(/\s+/)) {
      if (!word) continue
      const w = measure(word),
        gap = used ? size * 0.61 : 0
      if (used && used + gap + w > available) {
        count++
        used = 0
      }
      if (w > available) {
        const chunks = Math.ceil(w / available)
        count += chunks - 1
        used = w - (chunks - 1) * available
      } else used += (used ? gap : 0) + w
    }
    return total + count
  }, 0)
}
export function minNodeHeight(node: Pick<Component, 'name' | 'description'>, width: number) {
  return Math.max(
    98,
    32 +
      lines(node.name, width - 36, 16) * 24 +
      7 +
      lines(node.description || 'Add a description', width - 36, 14) * 21,
  )
}
export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export function resizeNode(
  node: Component,
  direction: ResizeDirection,
  dx: number,
  dy: number,
): Component {
  const width = Math.max(
    190,
    Math.min(1800, node.width + (direction.includes('e') ? dx : direction.includes('w') ? -dx : 0)),
  )
  const minimum = minNodeHeight(node, width)
  const height = Math.max(
    minimum,
    Math.min(
      20000,
      node.height + (direction.includes('s') ? dy : direction.includes('n') ? -dy : 0),
    ),
  )
  return {
    ...node,
    width,
    height,
    x: direction.includes('w') ? node.x + node.width - width : node.x,
    y: direction.includes('n') ? node.y + node.height - height : node.y,
  }
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
const obj = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === 'object' && !Array.isArray(v)
const string = (v: unknown, max = 100_000): v is string => typeof v === 'string' && v.length <= max
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 100_000
const types = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'text',
  'hardBreak',
])
function validateRich(v: unknown, depth = 0): asserts v is RichText {
  assert(depth < 24 && obj(v) && types.has(v.type), 'Unsupported text structure.')
  assert(
    v.text === undefined || (v.type === 'text' && string(v.text) && v.text.length > 0),
    'Invalid text content.',
  )
  assert(v.type !== 'text' || string(v.text), 'Missing text content.')
  if (v.attrs !== undefined) {
    assert(obj(v.attrs), 'Invalid text attributes.')
    const keys = Object.keys(v.attrs)
    assert(
      keys.every((k) =>
        v.type === 'heading'
          ? k === 'level'
          : v.type === 'orderedList'
            ? k === 'start' || k === 'type'
            : false,
      ),
      'Unsupported text attributes.',
    )
    if (v.type === 'heading') assert(v.attrs.level === 3, 'Unsupported heading level.')
    if (v.type === 'orderedList')
      assert(
        v.attrs.start === undefined ||
          (Number.isInteger(v.attrs.start) && v.attrs.start > 0 && v.attrs.start < 100000),
        'Invalid list start.',
      )
  }
  if (v.marks !== undefined)
    assert(
      Array.isArray(v.marks) &&
        v.marks.every(
          (m: unknown) =>
            obj(m) && ['code', 'bold', 'italic', 'strike'].includes(m.type) && !m.attrs,
        ),
      'Unsupported text formatting.',
    )
  const content = v.content ?? []
  assert(Array.isArray(content) && content.length <= 10_000, 'Too much text content.')
  for (const child of content) validateRich(child, depth + 1)
  const childTypes: string[] = content.map((c: RichText) => c.type!)
  if (['doc', 'listItem'].includes(v.type))
    assert(
      childTypes.every((t: string) =>
        ['paragraph', 'heading', 'bulletList', 'orderedList'].includes(t),
      ) && content.length > 0,
      'Invalid block structure.',
    )
  if (v.type === 'listItem')
    assert(childTypes[0] === 'paragraph', 'A list item must start with a paragraph.')
  if (['paragraph', 'heading'].includes(v.type))
    assert(
      childTypes.every((t: string) => ['text', 'hardBreak'].includes(t)),
      'Invalid paragraph structure.',
    )
  if (['bulletList', 'orderedList'].includes(v.type))
    assert(
      content.length > 0 && childTypes.every((t: string) => t === 'listItem'),
      'Invalid list structure.',
    )
  if (['text', 'hardBreak'].includes(v.type))
    assert(content.length === 0, 'Invalid inline content.')
}
export function parseDocument(input: unknown): DesignDocument {
  assert(
    obj(input) && [1, 2].includes(input.schemaVersion),
    'This file is not a supported system design document.',
  )
  assert(
    string(input.id, 100) && input.id && string(input.title, 1000) && string(input.updatedAt, 100),
    'Invalid document details.',
  )
  const r = input.requirements
  assert(
    obj(r) && string(r.heading, 300) && string(r.intro, 2000) && [1, 2].includes(r.columns),
    'Invalid requirements.',
  )
  const validateEditor = (g: unknown) => {
    validateRich(g)
    assert((g as RichText).type === 'doc', 'Invalid editor document.')
  }
  if (input.schemaVersion === 1) {
    assert(Array.isArray(r.groups) && r.groups.length === 2, 'Invalid requirements columns.')
    r.groups.forEach(validateEditor)
  } else {
    assert(obj(r.sections), 'Missing framing sections.')
    Object.keys(framingSections).forEach((key) => validateEditor(r.sections[key]))
  }
  assert(obj(input.approach) && string(input.approach.heading, 300), 'Invalid approach.')
  validateRich(input.approach.content)
  assert(input.approach.content.type === 'doc', 'Invalid approach document.')
  assert(
    Array.isArray(input.nodes) &&
      input.nodes.length <= 200 &&
      Array.isArray(input.edges) &&
      input.edges.length <= 1000,
    'Maximum 200 components and 1,000 connections per document.',
  )
  const ids = new Set<string>(),
    names = new Set<string>()
  for (const n of input.nodes) {
    assert(
      obj(n) && string(n.id, 100) && n.id && !ids.has(n.id) && Object.hasOwn(palette, n.kind),
      'Invalid or duplicate component.',
    )
    assert(
      string(n.name, 300) &&
        n.name.trim() &&
        !names.has(n.name.trim().toLocaleLowerCase()) &&
        string(n.description, 5000),
      'Invalid or duplicate component name.',
    )
    assert(
      [n.x, n.y, n.width, n.height].every(finite) &&
        n.width >= 190 &&
        n.width <= 1800 &&
        n.height >= 60 &&
        n.height <= 20000,
      'Invalid component dimensions.',
    )
    ids.add(n.id)
    names.add(n.name.trim().toLocaleLowerCase())
  }
  const edgeIds = new Set(),
    relationships = new Set()
  for (const e of input.edges) {
    assert(
      obj(e) &&
        string(e.id, 100) &&
        e.id &&
        !edgeIds.has(e.id) &&
        ids.has(e.sourceId) &&
        ids.has(e.targetId) &&
        e.sourceId !== e.targetId &&
        ['sync', 'async'].includes(e.mode) &&
        string(e.label, 300),
      'Invalid connection or missing component.',
    )
    const key = JSON.stringify([e.sourceId, e.targetId, e.mode])
    assert(!relationships.has(key), 'Duplicate connection.')
    edgeIds.add(e.id)
    relationships.add(key)
  }
  assert(
    Array.isArray(input.pages) && input.pages.length > 0 && input.pages.length <= 100,
    'Invalid pages.',
  )
  const pageIds = new Set(),
    pageNames = new Set()
  for (const p of input.pages) {
    assert(
      obj(p) &&
        string(p.id, 100) &&
        p.id &&
        !pageIds.has(p.id) &&
        string(p.title, 100) &&
        p.title.trim() &&
        !pageNames.has(p.title.trim().toLocaleLowerCase()),
      'Invalid or duplicate page.',
    )
    validateRich(p.content)
    assert(p.content.type === 'doc', 'Invalid page document.')
    pageIds.add(p.id)
    pageNames.add(p.title.trim().toLocaleLowerCase())
  }
  assert(
    input.pages.some((p: Page) => p.id === 'general' && p.title === 'GENERAL') &&
      pageIds.has(input.activePageId),
    'GENERAL and an active page are required.',
  )
  const v = input.viewport
  assert(
    obj(v) && [v.x, v.y, v.zoom].every(finite) && v.zoom >= 0.25 && v.zoom <= 2,
    'Invalid viewport.',
  )
  const result = structuredClone(input) as DesignDocument
  if (input.schemaVersion === 1) {
    result.schemaVersion = 2
    result.requirements = {
      heading: r.heading.trim().toLowerCase() === 'requirements' ? 'Goal' : r.heading,
      columns: r.columns,
      intro: r.intro,
      sections: migrateFraming(r.groups),
    }
  }
  result.nodes = result.nodes.map((n) => ({
    ...n,
    height: Math.max(n.height, minNodeHeight(n, n.width)),
  }))
  return result
}

// Only recognized headings move blocks. Never guess the meaning of authored prose.
function migrateFraming(groups: [RichText, RichText]): Record<FramingKey, RichText> {
  const content: Record<FramingKey, RichText[]> = {
    requirements: [],
    keyIdeas: [],
    guarantees: [],
    scaleConstraints: [],
  }
  const aliases: Record<string, FramingKey> = {
    functional: 'requirements',
    requirements: 'requirements',
    coreworkflows: 'requirements',
    assumptions: 'keyIdeas',
    keyideas: 'keyIdeas',
    guarantees: 'guarantees',
    keyguarantees: 'guarantees',
    scaleguarantees: 'guarantees',
    scale: 'scaleConstraints',
    constraints: 'scaleConstraints',
    scaleconstraints: 'scaleConstraints',
  }
  groups.forEach((group, index) => {
    let section: FramingKey = index === 0 ? 'requirements' : 'guarantees'
    for (const block of group.content ?? []) {
      const title =
        block.type === 'heading'
          ? block.content
              ?.map((run) => run.text ?? '')
              .join('')
              .toLowerCase()
              .replace(/[^a-z]/g, '')
          : undefined
      if (title && Object.hasOwn(aliases, title)) section = aliases[title]
      else content[section].push(structuredClone(block))
    }
  })
  const sections = emptyFraming()
  for (const key of Object.keys(content) as FramingKey[])
    if (content[key].length) sections[key] = { type: 'doc', content: content[key] }
  return sections
}
export function textRuns(text: string): RichText[] {
  const runs: RichText[] = []
  // Delimiters must be isolated: escaped backticks and fenced code remain literal.
  const re = /(?<![\\`])`([^`\n]+)(?<!\\)`(?!`)/g
  let last = 0
  for (const match of text.matchAll(re)) {
    if (match.index! > last) runs.push({ type: 'text', text: text.slice(last, match.index) })
    runs.push({ type: 'text', text: match[1], marks: [{ type: 'code' }] })
    last = match.index! + match[0].length
  }
  if (last < text.length) runs.push({ type: 'text', text: text.slice(last) })
  return runs
}
export function fromPlainText(text: string): RichText {
  const content: RichText[] = []
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (/^\s*- /.test(line)) {
      let list = content.at(-1)
      if (list?.type !== 'bulletList') {
        list = { type: 'bulletList', content: [] }
        content.push(list)
      }
      list.content!.push({
        type: 'listItem',
        content: [{ type: 'paragraph', content: textRuns(line.replace(/^\s*- /, '')) }],
      })
    } else content.push({ type: 'paragraph', content: textRuns(line) })
  }
  return { type: 'doc', content }
}
