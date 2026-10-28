import { useEffect, useRef, useState } from 'react'
import { blankDocument, type DesignDocument } from './model'
import { commit, initialHistory, undo, redo } from './history'
import { ConflictError, loadDraft, saveDraft } from './storage'
export function useDocument() {
  const [history, setHistory] = useState(() => initialHistory(blankDocument())),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState('Loading…'),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false),
    [epoch, setEpoch] = useState(0)
  const current = useRef(history.present)
  current.current = history.present
  const revision = useRef(0),
    pending = useRef<DesignDocument | null>(null),
    busy = useRef(false),
    blocked = useRef(false),
    lastQueued = useRef(''),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const channel = useRef<BroadcastChannel | null>(null)
  async function flush() {
    if (busy.current || blocked.current || !pending.current) return
    const doc = pending.current
    pending.current = null
    busy.current = true
    setStatus('Saving…')
    try {
      revision.current = await saveDraft(doc, revision.current)
      channel.current?.postMessage({ revision: revision.current })
      setStatus(pending.current ? 'Saving…' : 'Saved locally')
      setError('')
    } catch (e) {
      pending.current ??= doc
      blocked.current = true
      if (e instanceof ConflictError) {
        setConflict(true)
        setStatus('Another tab has changes')
      } else setStatus('Save failed')
      setError(
        e instanceof Error
          ? e.message
          : 'Local saving is unavailable. You can still export your work.',
      )
    } finally {
      busy.current = false
      if (pending.current && !blocked.current) void flush()
    }
  }
  useEffect(() => {
    let active = true
    loadDraft()
      .then(({ record, recovered }) => {
        if (!active) return
        if (record) {
          revision.current = record.revision
          lastQueued.current = JSON.stringify(record.doc)
          setHistory(initialHistory(record.doc))
          setStatus(recovered ? 'Recovered previous save' : 'Saved locally')
        } else {
          lastQueued.current = JSON.stringify(current.current)
          setStatus('Ready to create')
        }
        setReady(true)
      })
      .catch((e) => {
        if (active) {
          setError(e.message)
          setStatus('Save unavailable')
          blocked.current = true
          lastQueued.current = JSON.stringify(current.current)
          setReady(true)
        }
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (!ready) return
    const serialized = JSON.stringify(history.present)
    if (serialized === lastQueued.current) return
    lastQueued.current = serialized
    pending.current = history.present
    if (!blocked.current) setStatus('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => void flush(), 350)
  }, [history.present, ready])
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (pending.current || busy.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
    }
    window.addEventListener('beforeunload', onUnload)
    document.addEventListener('visibilitychange', onVisibility)
    if ('BroadcastChannel' in window) {
      const ch = new BroadcastChannel('sys-design-tool-saves')
      channel.current = ch
      ch.onmessage = (e) => {
        if (
          typeof e.data?.revision === 'number' &&
          e.data.revision > revision.current &&
          !busy.current
        ) {
          blocked.current = true
          setConflict(true)
          setStatus('Another tab has changes')
          setError(
            'Another tab saved a newer version. Export your copy or load the latest version.',
          )
        }
      }
    }
    return () => {
      window.removeEventListener('beforeunload', onUnload)
      document.removeEventListener('visibilitychange', onVisibility)
      channel.current?.close()
      clearTimeout(timer.current)
    }
  }, [])
  function change(updater: (doc: DesignDocument) => DesignDocument, group?: string) {
    setHistory((h) => commit(h, updater(h.present), group))
  }
  function goBack() {
    setHistory(undo)
    setEpoch((e) => e + 1)
  }
  function goForward() {
    setHistory(redo)
    setEpoch((e) => e + 1)
  }
  async function reloadLatest() {
    try {
      const { record } = await loadDraft()
      if (!record) return
      clearTimeout(timer.current)
      pending.current = null
      revision.current = record.revision
      blocked.current = false
      lastQueued.current = JSON.stringify(record.doc)
      setHistory(initialHistory(record.doc))
      setEpoch((e) => e + 1)
      setConflict(false)
      setError('')
      setStatus('Saved locally')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the saved document.')
    }
  }
  return {
    doc: history.present,
    ready,
    status,
    error,
    conflict,
    epoch,
    change,
    canUndo: !!history.past.length,
    canRedo: !!history.future.length,
    undo: goBack,
    redo: goForward,
    replace: (doc: DesignDocument) => {
      change(() => doc)
      setEpoch((e) => e + 1)
    },
    retry: () => {
      blocked.current = false
      pending.current = current.current
      void flush()
    },
    reloadLatest,
  }
}
