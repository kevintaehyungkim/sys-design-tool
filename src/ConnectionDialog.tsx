import { useRef, useState } from 'react'
import { ArrowRight, Check, ChevronDown, Search, Trash2 } from 'lucide-react'
import { palette, connectionError, id, type Component, type Connection } from './model'
import { Modal } from './ui'
function ComponentPicker({
  label,
  value,
  onChange,
  nodes,
  excluded,
}: {
  label: string
  value: string
  onChange: (id: string) => void
  nodes: Component[]
  excluded?: string
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('')
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = nodes.find((n) => n.id === value)
  const filtered = nodes
    .filter(
      (n) => n.id !== excluded && n.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        palette[a.kind].group.localeCompare(palette[b.kind].group) || a.name.localeCompare(b.name),
    )
  const groups = [...new Set(filtered.map((n) => palette[n.kind].group))]
  return (
    <div className="picker">
      <label>{label}</label>
      <button
        ref={trigger}
        type="button"
        className={`picker-trigger ${open ? 'open' : ''}`}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen(!open)
          setSearch('')
        }}
      >
        <span
          className="node-dot"
          style={{ background: selected ? palette[selected.kind].accent : '#69747a' }}
        />
        <span style={{ color: selected ? palette[selected.kind].accent : undefined }}>
          {selected?.name || 'Choose a component'}
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div
          className="picker-menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              trigger.current?.focus()
            }
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="option"]')],
                index = items.indexOf(document.activeElement as HTMLElement)
              items[
                (index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
              ]?.focus()
            }
          }}
        >
          <div className="search-field">
            <Search size={15} />
            <input
              autoFocus
              placeholder="Find a component"
              aria-label={`Search ${label.toLowerCase()} components`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div role="listbox" aria-label={`${label} components`} className="picker-options">
            {groups.map((group) => (
              <div role="group" aria-label={group} key={group}>
                <div className="picker-group">{group}</div>
                {filtered
                  .filter((n) => palette[n.kind].group === group)
                  .map((n) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={n.id === value}
                      key={n.id}
                      style={{ color: palette[n.kind].accent }}
                      onClick={() => {
                        onChange(n.id)
                        setOpen(false)
                        trigger.current?.focus()
                      }}
                    >
                      <span className="node-dot" style={{ background: palette[n.kind].accent }} />
                      <span>{n.name}</span>
                      {n.id === value && <Check size={14} />}
                    </button>
                  ))}
              </div>
            ))}
            {!filtered.length && <p className="muted">No matching components</p>}
          </div>
        </div>
      )}
    </div>
  )
}
export function ConnectionDialog({
  nodes,
  edges,
  sourceId,
  existing,
  onSave,
  onDelete,
  onClose,
}: {
  nodes: Component[]
  edges: Connection[]
  sourceId: string
  existing?: Connection
  onSave: (edge: Connection) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [from, setFrom] = useState(existing?.sourceId ?? sourceId),
    [to, setTo] = useState(existing?.targetId ?? ''),
    [mode, setMode] = useState<'sync' | 'async'>(existing?.mode ?? 'sync'),
    [label, setLabel] = useState(existing?.label ?? '')
  const draft = { sourceId: from, targetId: to, mode, label: label.trim() },
    error =
      !existing && edges.length >= 1000
        ? 'This document has reached 1,000 connections.'
        : connectionError(draft, nodes, edges, existing?.id)
  return (
    <Modal title={existing ? 'Edit connection' : 'Connect components'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!error) onSave({ ...draft, id: existing?.id ?? id() })
        }}
      >
        <div className="segment connection-mode" aria-label="Connection mode">
          <button
            type="button"
            className={mode === 'sync' ? 'active' : ''}
            aria-pressed={mode === 'sync'}
            onClick={() => setMode('sync')}
          >
            <span className="line-sample" />
            Sync
          </button>
          <button
            type="button"
            className={mode === 'async' ? 'active' : ''}
            aria-pressed={mode === 'async'}
            onClick={() => setMode('async')}
          >
            <span className="line-sample dashed" />
            Async
          </button>
        </div>
        <ComponentPicker
          label="From"
          value={from}
          nodes={nodes}
          onChange={(v) => {
            setFrom(v)
            if (to === v) setTo('')
          }}
        />
        <ComponentPicker label="To" value={to} nodes={nodes} excluded={from} onChange={setTo} />
        <label className="field-label" htmlFor="connection-label">
          Label <span className="muted">· optional</span>
        </label>
        <input
          id="connection-label"
          className="field-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={300}
          placeholder="e.g. click.created"
        />
        <p className="field-help">
          {mode === 'sync'
            ? 'Solid arrow · the caller waits for a response'
            : 'Dashed arrow · work continues independently'}
        </p>
        {nodes.length < 2 ? (
          <p className="form-error" role="status">
            Add a second component to create a connection.
          </p>
        ) : to && error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-footer">
          {existing && (
            <button type="button" className="danger-text" onClick={onDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="quiet-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={!!error}>
            {existing ? 'Save changes' : 'Create connection'}
            <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  )
}
