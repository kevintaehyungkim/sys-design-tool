import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, Pencil } from 'lucide-react'
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const dialog = ref.current!
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
    return () => {
      dialog.close()
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        close.current()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close.current()
        }
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function EditableTitle({
  value,
  onChange,
  label,
  placeholder,
  level = 2,
  maxLength = 300,
}: {
  value: string
  onChange: (v: string) => void
  label: string
  placeholder: string
  level?: 1 | 2 | 3
  maxLength?: number
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(value)
  const original = useRef(value),
    canceled = useRef(false)
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3'
  function start() {
    original.current = value
    setDraft(value)
    canceled.current = false
    setEditing(true)
  }
  function finish() {
    if (!canceled.current) onChange(draft.trim())
    setEditing(false)
  }
  return editing ? (
    <input
      autoFocus
      className={`title-input level-${level}`}
      aria-label={label}
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter') finish()
        if (e.key === 'Escape') {
          canceled.current = true
          setDraft(original.current)
          setEditing(false)
        }
      }}
    />
  ) : (
    <Tag className={`editable-title level-${level}`}>
      <button
        title={`Edit ${label.toLowerCase()}`}
        aria-label={`Edit ${label.toLowerCase()}`}
        onClick={start}
      >
        <span className={value ? '' : 'placeholder'}>{value || placeholder}</span>
        <Pencil size={level === 1 ? 15 : 13} />
      </button>
    </Tag>
  )
}
