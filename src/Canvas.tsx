import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  ArrowUpRight,
  Box,
  Cable,
  Database,
  GripHorizontal,
  Hand,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Monitor,
  MousePointer2,
  Move,
  Plus,
  Ruler,
  Search,
  Server,
  Shield,
  Trash2,
  Workflow,
} from 'lucide-react'
import {
  palette,
  id,
  minNodeHeight,
  nameError,
  uniqueName,
  removeNode,
  resizeNode,
  type Kind,
  type Component,
  type Connection,
  type DesignDocument,
  type ResizeDirection,
  type Viewport,
} from './model'
import { labelPoint, regionBounds, roundedPath, routeEdge, type Point } from './routing'
import { Modal } from './ui'
export type Change = (updater: (d: DesignDocument) => DesignDocument, group?: string) => void
const icons = {
  client: Monitor,
  service: Server,
  data: Database,
  cache: Layers,
  queue: Workflow,
  worker: Box,
  control: Shield,
  operations: Cable,
}
const directions: ResizeDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
type Gesture = {
  pointerId: number
  client: Point
  node?: Component
  direction?: ResizeDirection
  viewport?: Viewport
}
function NodeText({
  node,
  field,
  onCommit,
  autoFocus,
  onFinish,
}: {
  node: Component
  field: 'name' | 'description'
  onCommit: (s: string) => string
  autoFocus?: boolean
  onFinish: () => void
}) {
  const [editing, setEditing] = useState(!!autoFocus),
    [draft, setDraft] = useState(node[field]),
    [error, setError] = useState('')
  const cancel = useRef(false),
    input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) {
      setDraft(node[field])
      setEditing(true)
    }
  }, [autoFocus])
  useEffect(() => {
    if (editing) {
      input.current?.focus()
      if (field === 'name') input.current?.select()
    }
  }, [editing])
  function finish() {
    if (cancel.current) return
    const problem = onCommit(draft)
    if (problem) {
      setError(problem)
      return
    }
    setEditing(false)
    setError('')
    onFinish()
  }
  if (editing)
    return (
      <div className="node-edit-wrap">
        <textarea
          ref={input}
          className={`node-text-edit ${field}`}
          rows={Math.max(1, draft.split('\n').length)}
          aria-label={`Edit ${field} of ${node.name}`}
          value={draft}
          maxLength={field === 'name' ? 300 : 5000}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            setDraft(e.target.value)
            setError('')
          }}
          onBlur={finish}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.nativeEvent.isComposing) return
            if (e.key === 'Escape') {
              e.preventDefault()
              cancel.current = true
              setEditing(false)
              setError('')
              onFinish()
            }
            if (e.key === 'Enter' && (field === 'name' || e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              finish()
            }
          }}
        />
        {error && (
          <span className="node-error" role="alert">
            {error}
          </span>
        )}
      </div>
    )
  return (
    <button
      className={`node-text ${field} ${!node[field] ? 'empty' : ''}`}
      aria-label={`Edit ${field} of ${node.name}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        cancel.current = false
        setDraft(node[field])
        setEditing(true)
      }}
    >
      {node[field] || 'Add a description'}
    </button>
  )
}
export function ArchitectureCanvas({
  doc,
  change,
  onConnect,
  onEditEdge,
  notify,
}: {
  doc: DesignDocument
  change: Change
  onConnect: (id: string) => void
  onEditEdge: (edge: Connection) => void
  notify: (s: string) => void
}) {
  const canvas = useRef<HTMLDivElement>(null),
    gesture = useRef<Gesture | null>(null),
    latestPreview = useRef<Component | null>(null),
    latestView = useRef<Viewport | null>(null),
    space = useRef(false)
  const [selected, setSelected] = useState<string | null>(null),
    [preview, setPreview] = useState<Component | null>(null),
    [viewPreview, setViewPreview] = useState<Viewport | null>(null),
    [placement, setPlacement] = useState<Kind | null>(null),
    [ghost, setGhost] = useState<Point | null>(null),
    [pan, setPan] = useState(false),
    [expanded, setExpanded] = useState(false),
    [focusName, setFocusName] = useState<string | null>(null),
    [sizeId, setSizeId] = useState<string | null>(null),
    [connectionsOpen, setConnectionsOpen] = useState(false)
  const view = viewPreview ?? doc.viewport
  const nodes = useMemo(
    () => doc.nodes.map((n) => (n.id === preview?.id ? preview : n)),
    [doc.nodes, preview],
  )
  const routed = useMemo(
    () => doc.edges.map((edge) => ({ edge, points: routeEdge(edge, nodes, doc.edges) })),
    [doc.edges, nodes],
  )
  const unrouted = routed.filter((r) => !r.points).length
  const groupRegions = useMemo(
    () =>
      [...new Set(nodes.map((n) => palette[n.kind].group))].map((group) => {
        const members = nodes.filter((n) => palette[n.kind].group === group)
        return { group, rect: regionBounds(members), accent: palette[members[0].kind].accent }
      }),
    [nodes],
  )
  function screenToCanvas(clientX: number, clientY: number) {
    const box = canvas.current!.getBoundingClientRect()
    return {
      x: (clientX - box.left - view.x) / view.zoom,
      y: (clientY - box.top - view.y) / view.zoom,
    }
  }
  function addNode(kind: Kind, position?: Point) {
    if (doc.nodes.length >= 200) {
      notify('This document has reached 200 components.')
      return
    }
    let p =
      position ??
      screenToCanvas(
        canvas.current!.getBoundingClientRect().left + canvas.current!.clientWidth / 2,
        canvas.current!.getBoundingClientRect().top + canvas.current!.clientHeight / 2,
      )
    let x = Math.round((p.x - 130) / 12) * 12,
      y = Math.round((p.y - 50) / 12) * 12
    if (!position) {
      const free = (a: number, b: number) =>
        !doc.nodes.some(
          (n) =>
            a < n.x + n.width + 24 && a + 284 > n.x && b < n.y + n.height + 24 && b + 128 > n.y,
        )
      const box = canvas.current!.getBoundingClientRect(),
        topLeft = screenToCanvas(box.left + 28, box.top + 50),
        bottomRight = screenToCanvas(box.right - 28, box.bottom - 28)
      const candidates: Point[] = []
      for (let a = Math.ceil(topLeft.x / 36) * 36; a <= bottomRight.x - 260; a += 36)
        for (let b = Math.ceil(topLeft.y / 36) * 36; b <= bottomRight.y - 104; b += 36)
          candidates.push({ x: a, y: b })
      candidates.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))
      const spot = candidates.find((c) => free(c.x, c.y))
      if (spot) {
        x = spot.x
        y = spot.y
      } else {
        x = Math.max(x, ...doc.nodes.map((n) => n.x + n.width + 48))
        notify('Component added beside the current design. Use Fit to see it.')
      }
    }
    const node: Component = {
      id: id(),
      kind,
      name: uniqueName(
        palette[kind].label,
        doc.nodes.map((n) => n.name),
      ),
      description: '',
      x,
      y,
      width: 260,
      height: 104,
    }
    change((d) => ({ ...d, nodes: [...d.nodes, node] }))
    setSelected(node.id)
    setFocusName(node.id)
    setPlacement(null)
    setGhost(null)
  }
  function fit() {
    if (!nodes.length || !canvas.current) {
      change((d) => ({ ...d, viewport: { x: 40, y: 40, zoom: 1 } }), 'viewport')
      return
    }
    const bounds = regionBounds(nodes, 52),
      box = canvas.current
    const zoom = Math.max(
      0.25,
      Math.min(1, box.clientWidth / bounds.width, box.clientHeight / bounds.height),
    )
    change(
      (d) => ({
        ...d,
        viewport: {
          zoom,
          x: (box.clientWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
          y: (box.clientHeight - bounds.height * zoom) / 2 - bounds.y * zoom,
        },
      }),
      'viewport',
    )
  }
  useEffect(() => {
    if (
      selected &&
      !doc.nodes.some((n) => n.id === selected) &&
      !doc.edges.some((e) => e.id === selected)
    )
      setSelected(null)
  }, [doc.nodes, doc.edges, selected])
  function zoomBy(factor: number, client?: Point) {
    const box = canvas.current!.getBoundingClientRect(),
      point = client ?? { x: box.left + box.width / 2, y: box.top + box.height / 2 },
      at = screenToCanvas(point.x, point.y),
      zoom = Math.min(2, Math.max(0.25, view.zoom * factor))
    change(
      (d) => ({
        ...d,
        viewport: { zoom, x: point.x - box.left - at.x * zoom, y: point.y - box.top - at.y * zoom },
      }),
      'viewport',
    )
  }
  useEffect(() => {
    const el = canvas.current
    const wheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault()
        zoomBy(Math.exp(-e.deltaY * 0.005), { x: e.clientX, y: e.clientY })
      }
    }
    el?.addEventListener('wheel', wheel, { passive: false })
    return () => el?.removeEventListener('wheel', wheel)
  }, [view])
  function cancelGesture() {
    gesture.current = null
    latestPreview.current = null
    latestView.current = null
    setPreview(null)
    setViewPreview(null)
  }
  useEffect(() => {
    function keydown(e: KeyboardEvent) {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable="true"],dialog'))
        return
      if (e.code === 'Space' && canvas.current?.contains(document.activeElement)) {
        space.current = true
        e.preventDefault()
      }
      if (e.key === 'Escape') {
        cancelGesture()
        setSelected(null)
        setPlacement(null)
        setGhost(null)
      }
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selected &&
        canvas.current?.contains(document.activeElement)
      ) {
        e.preventDefault()
        deleteSelected()
      }
    }
    const keyup = (e: KeyboardEvent) => {
      if (e.code === 'Space') space.current = false
    }
    window.addEventListener('keydown', keydown)
    window.addEventListener('keyup', keyup)
    return () => {
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
    }
  }, [selected, doc])
  function deleteSelected() {
    const node = doc.nodes.find((n) => n.id === selected)
    if (node) {
      const count = doc.edges.filter((e) => e.sourceId === node.id || e.targetId === node.id).length
      change((d) => removeNode(d, node.id))
      notify(
        `Deleted ${node.name}${count ? ` and ${count} connection${count === 1 ? '' : 's'}` : ''}. Undo to restore.`,
      )
    } else {
      change((d) => ({ ...d, edges: d.edges.filter((e) => e.id !== selected) }))
      notify('Connection deleted. Undo to restore.')
    }
    setSelected(null)
  }
  function startNode(e: ReactPointerEvent, node: Component, direction?: ResizeDirection) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('input,textarea')) return
    e.preventDefault()
    e.stopPropagation()
    setSelected(node.id)
    canvas.current?.focus({ preventScroll: true })
    gesture.current = {
      pointerId: e.pointerId,
      client: { x: e.clientX, y: e.clientY },
      node,
      direction,
    }
    canvas.current!.setPointerCapture(e.pointerId)
  }
  function pointerMove(e: ReactPointerEvent) {
    const g = gesture.current
    if (!g) {
      if (placement) setGhost(screenToCanvas(e.clientX, e.clientY))
      return
    }
    if (g.pointerId !== e.pointerId) return
    const dx = e.clientX - g.client.x,
      dy = e.clientY - g.client.y
    if (g.node) {
      if (!g.direction && Math.hypot(dx, dy) < 4) return
      const next = g.direction
        ? resizeNode(g.node, g.direction, dx / view.zoom, dy / view.zoom)
        : {
            ...g.node,
            x: Math.round(g.node.x + dx / view.zoom),
            y: Math.round(g.node.y + dy / view.zoom),
          }
      latestPreview.current = next
      setPreview(next)
    } else if (g.viewport) {
      const next = { ...g.viewport, x: g.viewport.x + dx, y: g.viewport.y + dy }
      latestView.current = next
      setViewPreview(next)
    }
  }
  function pointerUp(e: ReactPointerEvent) {
    const g = gesture.current
    if (!g || g.pointerId !== e.pointerId) return
    const node = latestPreview.current,
      viewport = latestView.current
    if (node) change((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === node.id ? node : n)) }))
    if (viewport) change((d) => ({ ...d, viewport }), 'viewport')
    cancelGesture()
    if (canvas.current?.hasPointerCapture(e.pointerId))
      canvas.current.releasePointerCapture(e.pointerId)
  }
  function editText(node: Component, field: 'name' | 'description', value: string) {
    const text = value.trim()
    if (field === 'name') {
      const problem = nameError(
        text,
        doc.nodes.filter((n) => n.id !== node.id).map((n) => n.name),
      )
      if (problem) return problem
    }
    change((d) => ({
      ...d,
      nodes: d.nodes.map((n) => {
        if (n.id !== node.id) return n
        const next = { ...n, [field]: text }
        return { ...next, height: Math.max(next.height, minNodeHeight(next, next.width)) }
      }),
    }))
    return ''
  }
  const sizeNode = doc.nodes.find((n) => n.id === sizeId)
  const activeEdge = doc.edges.find((e) => e.id === selected)
  return (
    <section
      className={`card architecture-section ${expanded ? 'expanded' : ''}`}
      aria-label="System architecture"
    >
      <header className="card-header">
        <h2>System architecture</h2>
        <div className="canvas-controls">
          <span className="legend">
            <i />
            Sync
          </span>
          <span className="legend async">
            <i />
            Async
          </span>
          <span className="control-divider" />
          <button
            className="icon-button"
            title="Pan canvas"
            aria-label="Pan canvas"
            aria-pressed={pan}
            onClick={() => {
              setPan(!pan)
              setPlacement(null)
            }}
          >
            {pan ? <MousePointer2 size={17} /> : <Hand size={17} />}
          </button>
          <button className="small-button" onClick={fit}>
            <Search size={14} />
            Fit
          </button>
          <button className="icon-button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.15)}>
            <Minus size={15} />
          </button>
          <span className="zoom-label">{Math.round(view.zoom * 100)}%</span>
          <button className="icon-button" aria-label="Zoom in" onClick={() => zoomBy(1.15)}>
            <Plus size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={expanded ? 'Collapse canvas' : 'Expand canvas'}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>
      <div className="palette" aria-label="Component templates">
        {(Object.keys(palette) as Kind[]).map((kind) => {
          const color = palette[kind],
            Icon = icons[kind]
          return (
            <button
              key={kind}
              draggable
              className={`template ${placement === kind ? 'active' : ''}`}
              style={{ '--accent': color.accent, '--fill': color.top } as CSSProperties}
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-system-component', kind)
                e.dataTransfer.effectAllowed = 'copy'
                setPlacement(null)
              }}
              onClick={(e) => {
                if (e.detail === 0) addNode(kind)
                else {
                  setPlacement(placement === kind ? null : kind)
                  setPan(false)
                  canvas.current?.focus()
                }
              }}
              title={`Drag ${color.label.toLowerCase()} onto the grid · Enter to add`}
            >
              <Icon size={14} />
              <span>{color.label}</span>
              <GripHorizontal size={12} className="grip" />
            </button>
          )
        })}
        <span className="palette-hint">Drag to add</span>
      </div>
      <div
        ref={canvas}
        tabIndex={0}
        className={`diagram-viewport ${pan ? 'pan-mode' : ''} ${placement ? 'placing' : ''}`}
        aria-label="Architecture canvas"
        style={{
          backgroundPosition: `${view.x}px ${view.y}px`,
          backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
        }}
        onPointerDown={(e) => {
          if (
            e.target !== e.currentTarget &&
            !(e.target as HTMLElement).classList.contains('diagram-world') &&
            !(e.target as HTMLElement).classList.contains('edge-layer')
          )
            return
          if (e.button !== 0 && e.button !== 1) return
          canvas.current?.focus({ preventScroll: true })
          if (placement) {
            addNode(placement, screenToCanvas(e.clientX, e.clientY))
            return
          }
          setSelected(null)
          if (pan || space.current || e.button === 1) {
            e.preventDefault()
            gesture.current = {
              pointerId: e.pointerId,
              client: { x: e.clientX, y: e.clientY },
              viewport: view,
            }
            canvas.current!.setPointerCapture(e.pointerId)
          }
        }}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={() => {
          if (gesture.current) cancelGesture()
        }}
        onPointerLeave={() => {
          if (!gesture.current) setGhost(null)
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/x-system-component')) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
            setGhost(screenToCanvas(e.clientX, e.clientY))
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          const kind = e.dataTransfer.getData('application/x-system-component') as Kind
          if (Object.hasOwn(palette, kind)) addNode(kind, screenToCanvas(e.clientX, e.clientY))
          setGhost(null)
        }}
      >
        {!nodes.length && (
          <div className="canvas-empty">
            <div className="empty-symbol">
              <Workflow size={30} />
            </div>
            <h3>Every system starts with a component</h3>
            <p>Drag a template here, or click one and choose a spot</p>
            <span>Keyboard: focus a template and press Enter</span>
          </div>
        )}
        <div
          className="diagram-world"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          {groupRegions.map(({ group, rect, accent }) => (
            <div
              key={group}
              className="diagram-region"
              style={{
                left: rect.x,
                top: rect.y,
                width: rect.width,
                height: rect.height,
                borderColor: `${accent}38`,
                background: `${accent}0e`,
              }}
            >
              <span style={{ color: accent }}>{group}</span>
            </div>
          ))}
          <svg className="edge-layer" width="1" height="1" aria-label="Connections">
            <defs>
              {(['sync', 'async'] as const).map((mode) => (
                <marker
                  key={mode}
                  id={`arrow-${mode}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path
                    d="M1 1 L9 5 L1 9"
                    fill="none"
                    stroke={mode === 'sync' ? '#CCCAC4' : '#EF9F27'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </marker>
              ))}
            </defs>
            {routed.map(({ edge, points }) => {
              if (!points) return null
              const path = roundedPath(points),
                p = labelPoint(points),
                chosen = selected === edge.id,
                label = `${doc.nodes.find((n) => n.id === edge.sourceId)?.name} to ${doc.nodes.find((n) => n.id === edge.targetId)?.name}, ${edge.mode}`
              return (
                <g
                  key={edge.id}
                  className={`edge ${chosen ? 'selected' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Edit connection: ${label}`}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    setSelected(edge.id)
                  }}
                  onClick={() => setSelected(edge.id)}
                  onDoubleClick={() => onEditEdge(edge)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation()
                      onEditEdge(edge)
                    }
                    if (e.key === 'Delete' || e.key === 'Backspace') {
                      e.preventDefault()
                      e.stopPropagation()
                      change((d) => ({ ...d, edges: d.edges.filter((x) => x.id !== edge.id) }))
                      notify('Connection deleted. Undo to restore.')
                    }
                  }}
                >
                  <path className="edge-hit" d={path} />
                  {chosen && <path className="edge-glow" d={path} />}
                  <path
                    className="edge-line"
                    d={path}
                    stroke={edge.mode === 'sync' ? '#CCCAC4' : '#EF9F27'}
                    strokeDasharray={edge.mode === 'async' ? '8 7' : undefined}
                    markerEnd={`url(#arrow-${edge.mode})`}
                  />
                  {edge.label && (
                    <g className="edge-label" transform={`translate(${p.x},${p.y})`}>
                      <rect
                        x={-Math.min(260, edge.label.length * 6 + 16) / 2}
                        y={-10}
                        width={Math.min(260, edge.label.length * 6 + 16)}
                        height={20}
                        rx={4}
                      />
                      <text textAnchor="middle" dy="4">
                        {edge.label.length > 39 ? `${edge.label.slice(0, 38)}…` : edge.label}
                      </text>
                      <title>{edge.label}</title>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
          {nodes.map((node) => {
            const c = palette[node.kind]
            return (
              <div
                key={node.id}
                role="group"
                tabIndex={0}
                aria-label={`${node.name} component`}
                data-node-id={node.id}
                className={`diagram-node ${selected === node.id ? 'selected' : ''}`}
                style={
                  {
                    left: node.x,
                    top: node.y,
                    width: node.width,
                    height: node.height,
                    '--accent': c.accent,
                    '--top': c.top,
                    '--bottom': c.bottom,
                    '--handle-scale': 1 / view.zoom,
                  } as CSSProperties
                }
                onFocus={() => setSelected(node.id)}
                onPointerDown={(e) => startNode(e, node)}
                onClick={() => setSelected(node.id)}
                onKeyDown={(e) => {
                  if ((e.target as HTMLElement).closest('button,input,textarea')) return
                  const movement: Record<string, Point> = {
                    ArrowLeft: { x: -1, y: 0 },
                    ArrowRight: { x: 1, y: 0 },
                    ArrowUp: { x: 0, y: -1 },
                    ArrowDown: { x: 0, y: 1 },
                  }
                  if (movement[e.key]) {
                    e.preventDefault()
                    const step = e.shiftKey ? 48 : 12,
                      delta = movement[e.key]
                    change(
                      (d) => ({
                        ...d,
                        nodes: d.nodes.map((n) =>
                          n.id === node.id
                            ? { ...n, x: n.x + delta.x * step, y: n.y + delta.y * step }
                            : n,
                        ),
                      }),
                      `move-${node.id}`,
                    )
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    setFocusName(node.id)
                  }
                }}
              >
                <div className="node-actions" onPointerDown={(e) => e.stopPropagation()}>
                  <button
                    className="node-move"
                    aria-label={`Move ${node.name}`}
                    title="Drag to move"
                    onPointerDown={(e) => startNode(e, node)}
                  >
                    <Move size={15} />
                  </button>
                  <button
                    aria-label={`Resize ${node.name}`}
                    title="Set size"
                    onClick={() => setSizeId(node.id)}
                  >
                    <Ruler size={15} />
                  </button>
                  <button
                    aria-label={`Delete ${node.name}`}
                    title="Delete component"
                    onClick={() => {
                      const count = doc.edges.filter(
                        (e) => e.sourceId === node.id || e.targetId === node.id,
                      ).length
                      change((d) => removeNode(d, node.id))
                      notify(
                        `Deleted ${node.name}${count ? ` and ${count} connections` : ''}. Undo to restore.`,
                      )
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    aria-label={`Connect ${node.name}`}
                    title="Connect component"
                    onClick={() => onConnect(node.id)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </div>
                <div className="node-content">
                  <NodeText
                    node={node}
                    field="name"
                    autoFocus={focusName === node.id}
                    onFinish={() => setFocusName(null)}
                    onCommit={(value) => editText(node, 'name', value)}
                  />
                  <NodeText
                    node={node}
                    field="description"
                    onFinish={() => {}}
                    onCommit={(value) => editText(node, 'description', value)}
                  />
                </div>
                {directions.map((direction) => (
                  <div
                    key={direction}
                    data-resize={direction}
                    className={`resize-target ${direction}`}
                    onPointerDown={(e) => startNode(e, node, direction)}
                  >
                    <span />
                  </div>
                ))}
              </div>
            )
          })}
          {ghost && (
            <div
              className="placement-ghost"
              style={{ left: ghost.x - 130, top: ghost.y - 52, width: 260, height: 104 }}
            >
              {placement ? palette[placement].label : 'Drop component'}
            </div>
          )}
        </div>
        {activeEdge && (
          <div className="edge-actions">
            <span>{activeEdge.mode === 'async' ? 'Async' : 'Sync'} connection</span>
            <button onClick={() => onEditEdge(activeEdge)}>Edit</button>
            <button aria-label="Delete selected connection" onClick={deleteSelected}>
              <Trash2 size={14} />
            </button>
          </div>
        )}
        {placement && (
          <div className="placement-hint">
            Click to place {palette[placement].label.toLowerCase()}{' '}
            <button
              onClick={() => {
                setPlacement(null)
                setGhost(null)
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <footer className="canvas-footer">
        <span>
          Drag to move · Drag any edge or corner to resize{' '}
          <span className="desktop-hint">· ⌘/Ctrl + scroll to zoom</span>
        </span>
        <button
          className={unrouted ? 'route-warning' : ''}
          onClick={() => setConnectionsOpen(true)}
        >
          {nodes.length} components · {doc.edges.length} connections
          {unrouted ? ` · ${unrouted} needs space` : ''}
        </button>
      </footer>
      {sizeNode && (
        <SizeDialog
          node={sizeNode}
          onClose={() => setSizeId(null)}
          onSave={(width, height, kind) => {
            change((d) => ({
              ...d,
              nodes: d.nodes.map((n) =>
                n.id === sizeNode.id
                  ? { ...n, kind, width, height: Math.max(height, minNodeHeight(n, width)) }
                  : n,
              ),
            }))
            setSizeId(null)
          }}
        />
      )}
      {connectionsOpen && (
        <Modal title="Connections" onClose={() => setConnectionsOpen(false)}>
          <div className="connection-list">
            {!doc.edges.length && (
              <p className="muted">Select a component and use its arrow to create a connection.</p>
            )}
            {routed.map(({ edge, points }) => (
              <button
                key={edge.id}
                onClick={() => {
                  setConnectionsOpen(false)
                  onEditEdge(edge)
                }}
              >
                <span>
                  {nodes.find((n) => n.id === edge.sourceId)?.name} →{' '}
                  {nodes.find((n) => n.id === edge.targetId)?.name}
                </span>
                <small>
                  {edge.mode}
                  {!points ? ' · Move overlapping components to make room' : ''}
                </small>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </section>
  )
}
function SizeDialog({
  node,
  onSave,
  onClose,
}: {
  node: Component
  onSave: (w: number, h: number, kind: Kind) => void
  onClose: () => void
}) {
  const [width, setWidth] = useState(node.width),
    [height, setHeight] = useState(node.height),
    [kind, setKind] = useState(node.kind)
  const minimum = minNodeHeight(node, width)
  return (
    <Modal title={`Component settings`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (width >= 190 && width <= 1800 && height >= minimum && height <= 20000)
            onSave(width, height, kind)
        }}
      >
        <p className="muted">{node.name}</p>
        <div className="size-fields">
          <label>
            Width
            <input
              autoFocus
              data-initial-focus
              className="field-input"
              type="number"
              min={190}
              max={1800}
              value={Math.round(width)}
              onChange={(e) => {
                const w = Number(e.target.value)
                setWidth(w)
                setHeight((h) => Math.max(h, minNodeHeight(node, w)))
              }}
            />
          </label>
          <label>
            Height
            <input
              className="field-input"
              type="number"
              min={minimum}
              max={20000}
              value={Math.round(height)}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </label>
        </div>
        <label className="field-label">
          Component type
          <select
            className="field-input"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {(Object.keys(palette) as Kind[]).map((k) => (
              <option key={k} value={k}>
                {palette[k].label} · {palette[k].group}
              </option>
            ))}
          </select>
        </label>
        <p className="field-help">The minimum height grows to fit your text.</p>
        <div className="modal-footer">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            Apply
          </button>
        </div>
      </form>
    </Modal>
  )
}
