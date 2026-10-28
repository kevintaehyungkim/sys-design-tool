import type { DesignDocument } from './model'
export interface History {
  past: DesignDocument[]
  present: DesignDocument
  future: DesignDocument[]
  group?: string
  at: number
}
export const initialHistory = (doc: DesignDocument): History => ({
  past: [],
  present: doc,
  future: [],
  at: 0,
})
export function commit(
  history: History,
  doc: DesignDocument,
  group?: string,
  at = Date.now(),
): History {
  if (JSON.stringify(history.present) === JSON.stringify(doc)) return history
  const coalesce = !!group && group === history.group && at - history.at < 800
  return {
    past: coalesce ? history.past : [...history.past.slice(-99), history.present],
    present: { ...doc, updatedAt: new Date().toISOString() },
    future: [],
    group,
    at,
  }
}
export function undo(history: History): History {
  if (!history.past.length) return history
  return {
    past: history.past.slice(0, -1),
    present: history.past.at(-1)!,
    future: [history.present, ...history.future],
    at: 0,
  }
}
export function redo(history: History): History {
  if (!history.future.length) return history
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
    at: 0,
  }
}
