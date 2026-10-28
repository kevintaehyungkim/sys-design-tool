import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Columns2,
  Download,
  HelpCircle,
  LayoutTemplate,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Rows2,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { ArchitectureCanvas } from './Canvas'
import { RichEditor } from './Editor'
import { ConnectionDialog } from './ConnectionDialog'
import { EditableTitle, Modal } from './ui'
import { useDocument } from './useDocument'
import {
  blankDocument,
  framingColumns,
  framingSections,
  id,
  nameError,
  parseDocument,
  uniqueName,
  emptyText,
  type Connection,
  type DesignDocument,
} from './model'
import { exampleDocument } from './example'
import { regionBounds } from './routing'
export default function App() {
  const store = useDocument(),
    { doc, change } = store
  const [connection, setConnection] = useState<{ sourceId: string; existing?: Connection } | null>(
      null,
    ),
    [renamingPage, setRenamingPage] = useState<string | null>(null),
    [help, setHelp] = useState(false),
    [toast, setToast] = useState('')
  const [fileError, setFileError] = useState('')
  const upload = useRef<HTMLInputElement>(null),
    menu = useRef<HTMLDetailsElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  function notify(message: string) {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 5500)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,[contenteditable="true"],dialog'))
        return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        store.redo()
      }
      if (e.key === 'Escape' && menu.current) menu.current.open = false
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [store.undo, store.redo])
  function exportDocument() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a')
    a.href = url
    a.download = `${
      (doc.title || 'system-design')
        .replace(/[^\p{L}\p{N} _-]/gu, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 80) || 'system-design'
    }.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Document exported')
  }
  async function importFile(file: File | undefined) {
    if (!file) return
    try {
      if (file.size > 5_000_000) throw new Error('Choose a JSON document smaller than 5 MB.')
      const incoming = parseDocument(JSON.parse(await file.text()))
      store.replace(incoming)
      setFileError('')
      notify('Document imported. Undo to return to your previous work.')
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Could not read this document.')
    }
    if (upload.current) upload.current.value = ''
  }
  function replaceDocument(next: DesignDocument, message: string) {
    store.replace(next)
    setConnection(null)
    setRenamingPage(null)
    notify(message)
    if (menu.current) menu.current.open = false
  }
  function loadExample() {
    const next = exampleDocument(),
      el = document.querySelector<HTMLElement>('.diagram-viewport')
    if (el) {
      const bounds = regionBounds(next.nodes, 52),
        zoom = Math.max(
          0.25,
          Math.min(1, el.clientWidth / bounds.width, el.clientHeight / bounds.height),
        )
      next.viewport = {
        zoom,
        x: (el.clientWidth - bounds.width * zoom) / 2 - bounds.x * zoom,
        y: (el.clientHeight - bounds.height * zoom) / 2 - bounds.y * zoom,
      }
    }
    replaceDocument(next, 'Example loaded. Undo to restore your previous work.')
  }
  function addPage() {
    if (doc.pages.length >= 100) {
      notify('This document has reached 100 pages.')
      return
    }
    const page = {
      id: id(),
      title: uniqueName(
        'New page',
        doc.pages.map((p) => p.title),
      ),
      content: emptyText(),
    }
    change((d) => ({ ...d, pages: [...d.pages, page], activePageId: page.id }))
    setRenamingPage(page.id)
  }
  function activatePage(pageId: string) {
    change((d) => ({ ...d, activePageId: pageId }), 'active-page')
  }
  const activePage = doc.pages.find((p) => p.id === doc.activePageId) ?? doc.pages[0]
  const pageRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const tab = pageRef.current,
      bar = tab?.parentElement
    if (!tab || !bar) return
    const item = tab.getBoundingClientRect(),
      viewport = bar.getBoundingClientRect()
    if (item.left < viewport.left) bar.scrollLeft -= viewport.left - item.left
    else if (item.right > viewport.right) bar.scrollLeft += item.right - viewport.right
  }, [doc.activePageId])
  if (!store.ready)
    return (
      <div className="loading">
        <Loader2 className="spin" size={22} />
        Opening your workspace
      </div>
    )
  return (
    <>
      <main className="workspace">
        <header className="document-header">
          <EditableTitle
            value={doc.title}
            onChange={(title) => change((d) => ({ ...d, title }))}
            label="Document title"
            placeholder="Untitled system design"
            level={1}
            maxLength={1000}
          />
          <div className="document-actions">
            <button
              className="reset-button"
              title="Clear the document and start fresh"
              onClick={() => {
                replaceDocument(
                  blankDocument(),
                  'Document reset. ⌘/Ctrl Z restores your previous work.',
                )
                setFileError('')
              }}
            >
              <RotateCcw size={15} />
              Reset
            </button>
            <details className="document-menu" ref={menu}>
              <summary title="Document menu" aria-label="Document menu">
                <MoreHorizontal size={21} />
              </summary>
              <div className="menu-items">
                <button onClick={loadExample}>
                  <LayoutTemplate size={16} />
                  Load example
                </button>
                <div className="menu-divider" />
                <button
                  onClick={() => {
                    exportDocument()
                    menu.current!.open = false
                  }}
                >
                  <Download size={16} />
                  Export JSON
                </button>
                <button
                  onClick={() => {
                    upload.current?.click()
                    menu.current!.open = false
                  }}
                >
                  <Upload size={16} />
                  Import JSON
                </button>
                <div className="menu-divider" />
                <button
                  onClick={() => {
                    setHelp(true)
                    menu.current!.open = false
                  }}
                >
                  <HelpCircle size={16} />
                  Editing guide
                </button>
              </div>
            </details>
            <input
              ref={upload}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              tabIndex={-1}
              aria-label="Import design document"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
        </header>
        {store.error && (
          <div className="notice" role="alert">
            <p>
              {store.conflict
                ? 'A newer version was saved in another tab. Export your copy before loading it.'
                : `${store.error} Your work is still available in this tab.`}
            </p>
            <button onClick={exportDocument}>Export my copy</button>
            {store.conflict ? (
              <button onClick={() => void store.reloadLatest()}>Load latest version</button>
            ) : (
              <button onClick={store.retry}>Retry saving</button>
            )}
          </div>
        )}
        {fileError && (
          <div className="notice" role="alert">
            <p>Import failed: {fileError}</p>
            <button aria-label="Dismiss import error" onClick={() => setFileError('')}>
              <X size={16} />
            </button>
          </div>
        )}
        <section className="card requirements-section">
          <header className="card-header">
            <EditableTitle
              value={doc.requirements.heading}
              onChange={(heading) =>
                change((d) => ({ ...d, requirements: { ...d.requirements, heading } }))
              }
              label="Goal heading"
              placeholder="Goal"
            />
            <div className="segment">
              <button
                className={doc.requirements.columns === 1 ? 'active' : ''}
                aria-pressed={doc.requirements.columns === 1}
                onClick={() =>
                  change((d) => ({ ...d, requirements: { ...d.requirements, columns: 1 } }))
                }
              >
                <Rows2 size={14} />1 column
              </button>
              <button
                className={doc.requirements.columns === 2 ? 'active' : ''}
                aria-pressed={doc.requirements.columns === 2}
                onClick={() =>
                  change((d) => ({ ...d, requirements: { ...d.requirements, columns: 2 } }))
                }
              >
                <Columns2 size={14} />2 columns
              </button>
            </div>
          </header>
          <input
            className="document-intro"
            aria-label="Goal summary"
            placeholder="Add a short summary of the system…"
            value={doc.requirements.intro}
            maxLength={2000}
            onChange={(e) =>
              change(
                (d) => ({ ...d, requirements: { ...d.requirements, intro: e.target.value } }),
                'intro',
              )
            }
          />
          <div className={`requirements-grid columns-${doc.requirements.columns}`}>
            {framingColumns.map((sections, index) => (
              <div className="requirement-column" key={index}>
                {sections.map((key) => (
                  <section className="framing-section" key={key} aria-labelledby={`framing-${key}`}>
                    <h3
                      id={`framing-${key}`}
                      className="framing-title"
                      style={{ color: framingSections[key].color }}
                    >
                      {framingSections[key].title}
                    </h3>
                    <RichEditor
                      key={`${doc.id}-${store.epoch}-${key}`}
                      value={doc.requirements.sections[key]}
                      label={framingSections[key].title}
                      placeholder={framingSections[key].placeholder}
                      onChange={(value) =>
                        change(
                          (d) => ({
                            ...d,
                            requirements: {
                              ...d.requirements,
                              sections: { ...d.requirements.sections, [key]: value },
                            },
                          }),
                          `framing-${key}`,
                        )
                      }
                    />
                  </section>
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className="card approach-section">
          <header className="card-header">
            <EditableTitle
              value={doc.approach.heading}
              onChange={(heading) =>
                change((d) => ({ ...d, approach: { ...d.approach, heading } }))
              }
              label="Design approach heading"
              placeholder="Design approach"
            />
          </header>
          <div className="prose-pad">
            <RichEditor
              key={`${doc.id}-${store.epoch}-approach`}
              value={doc.approach.content}
              label="Design approach"
              placeholder="Describe the approach, tradeoffs, and key decisions…"
              onChange={(content) =>
                change((d) => ({ ...d, approach: { ...d.approach, content } }), 'approach')
              }
            />
          </div>
        </section>
        <ArchitectureCanvas
          key={doc.id}
          doc={doc}
          change={change}
          onConnect={(sourceId) => setConnection({ sourceId })}
          onEditEdge={(existing) => setConnection({ sourceId: existing.sourceId, existing })}
          notify={notify}
        />
        <section className="card notes-section" aria-label="Design notes">
          <header className="tabs-header">
            <div role="tablist" aria-label="Note pages" className="tabs-scroll">
              {doc.pages.map((page, i) => (
                <button
                  ref={page.id === activePage.id ? pageRef : undefined}
                  key={page.id}
                  role="tab"
                  id={`tab-${page.id}`}
                  aria-controls={`panel-${page.id}`}
                  aria-selected={page.id === activePage.id}
                  tabIndex={page.id === activePage.id ? 0 : -1}
                  className={`note-tab ${page.id === activePage.id ? 'active' : ''}`}
                  onClick={() => activatePage(page.id)}
                  onDoubleClick={() => {
                    if (page.id !== 'general') setRenamingPage(page.id)
                  }}
                  onKeyDown={(e) => {
                    if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault()
                      const index =
                        e.key === 'Home'
                          ? 0
                          : e.key === 'End'
                            ? doc.pages.length - 1
                            : (i + (e.key === 'ArrowRight' ? 1 : -1) + doc.pages.length) %
                              doc.pages.length
                      document.getElementById(`tab-${doc.pages[index].id}`)?.focus()
                    }
                  }}
                >
                  <span>{page.title}</span>
                </button>
              ))}
            </div>
            <button
              className="icon-button add-page"
              title="Add page"
              aria-label="Add page"
              onClick={addPage}
            >
              <Plus size={18} />
            </button>
            <div className="page-actions">
              {activePage.id !== 'general' && (
                <>
                  <button
                    className="icon-button"
                    title="Rename page"
                    aria-label="Rename page"
                    onClick={() => setRenamingPage(activePage.id)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-button"
                    title="Delete page"
                    aria-label="Delete page"
                    onClick={() => {
                      change((d) => {
                        const index = d.pages.findIndex((p) => p.id === activePage.id),
                          pages = d.pages.filter((p) => p.id !== activePage.id)
                        return { ...d, pages, activePageId: pages[Math.max(0, index - 1)].id }
                      })
                      notify('Page deleted. Undo to restore it.')
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </header>
          <div
            role="tabpanel"
            id={`panel-${activePage.id}`}
            aria-labelledby={`tab-${activePage.id}`}
            className="notes-body"
          >
            <RichEditor
              key={`${doc.id}-${store.epoch}-${activePage.id}`}
              value={activePage.content}
              label={`${activePage.title} notes`}
              placeholder="Capture the details that make this design yours…"
              onChange={(content) =>
                change(
                  (d) => ({
                    ...d,
                    pages: d.pages.map((p) => (p.id === activePage.id ? { ...p, content } : p)),
                  }),
                  `page-${activePage.id}`,
                )
              }
            />
          </div>
        </section>
        <footer className="workspace-footer">
          <span>
            SYS DESIGN TOOL <i /> A place to think in systems
          </span>
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={13} />
            Editing guide
          </button>
        </footer>
      </main>
      {connection && (
        <ConnectionDialog
          nodes={doc.nodes}
          edges={doc.edges}
          sourceId={connection.sourceId}
          existing={connection.existing}
          onClose={() => setConnection(null)}
          onSave={(edge) => {
            change((d) => ({
              ...d,
              edges: connection.existing
                ? d.edges.map((e) => (e.id === edge.id ? edge : e))
                : [...d.edges, edge],
            }))
            setConnection(null)
            notify(connection.existing ? 'Connection updated' : 'Connection created')
          }}
          onDelete={() => {
            change((d) => ({
              ...d,
              edges: d.edges.filter((e) => e.id !== connection.existing?.id),
            }))
            setConnection(null)
            notify('Connection deleted. Undo to restore.')
          }}
        />
      )}
      {renamingPage && (
        <RenamePage
          key={renamingPage}
          value={doc.pages.find((p) => p.id === renamingPage)?.title ?? ''}
          names={doc.pages.filter((p) => p.id !== renamingPage).map((p) => p.title)}
          onClose={() => setRenamingPage(null)}
          onSave={(title) => {
            change((d) => ({
              ...d,
              pages: d.pages.map((p) => (p.id === renamingPage ? { ...p, title } : p)),
            }))
            setRenamingPage(null)
          }}
        />
      )}
      {help && (
        <Modal title="Make room for your ideas" onClose={() => setHelp(false)} wide>
          <div className="help-content">
            <h3>Writing</h3>
            <p>
              Click a title to rename it. Focus a text area to reveal its style menu. Choose{' '}
              <strong>Section heading</strong> for an uppercase heading; Enter returns to body text.
              Requirements and Key Ideas are on the left; Guarantees and Scale/Constraints are on
              the right. One-column mode stacks them without moving any text.
            </p>
            <p>
              Type <code>- </code> to start round bullets. Enter continues a list; Enter on an empty
              bullet ends it. Surround text with single backticks for <code>inline code</code>.
            </p>
            <h3>Architecture</h3>
            <p>
              Drag a template to the canvas, or click a template and then choose a spot. Enter on a
              focused template adds a component. Click its name or description to edit. Drag its
              body or move icon to reposition it; drag any border or corner to resize.
            </p>
            <p>
              Select a component to reveal connect, delete, and size controls. Arrow keys move a
              focused component; Shift moves it farther. Use the hand tool or hold Space and drag to
              pan. ⌘/Ctrl + scroll zooms; Fit brings everything into view.
            </p>
            <p>
              Click an arrow to select it, then choose Edit. You can also open the connection list
              at the bottom right of the canvas. Connections needing more space are listed there.
            </p>
            <h3>Your work</h3>
            <p>
              The + adds a separate notes page. Changes save quietly in this browser. Reset clears
              all text, components, connections and custom pages. Use the document menu to export a
              JSON backup, import one, or load the example. ⌘/Ctrl Z undoes your last change; Shift
              adds redo. Deleted components, connections and pages can be restored with Undo.
            </p>
          </div>
          <div className="modal-footer">
            <button className="primary-button" onClick={() => setHelp(false)}>
              Start designing
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  )
}
function RenamePage({
  value,
  names,
  onClose,
  onSave,
}: {
  value: string
  names: string[]
  onClose: () => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState(value),
    problem = nameError(name, names)
  return (
    <Modal title="Name this page" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!problem) onSave(name.trim())
        }}
      >
        <label htmlFor="page-name" className="field-label">
          Page name
        </label>
        <input
          autoFocus
          data-initial-focus
          id="page-name"
          className="field-input"
          value={name}
          maxLength={100}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setName(e.target.value)}
        />
        {problem && (
          <p className="form-error" role="alert">
            {problem}
          </p>
        )}
        <div className="modal-footer">
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={!!problem}>
            Save name
          </button>
        </div>
      </form>
    </Modal>
  )
}
