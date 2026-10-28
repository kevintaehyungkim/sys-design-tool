import { parseDocument, type DesignDocument } from './model'
export interface RecordData {
  doc: DesignDocument
  revision: number
}
export class ConflictError extends Error {
  constructor() {
    super('A newer version was saved in another tab.')
  }
}
let database: Promise<IDBDatabase> | undefined
function openDB(): Promise<IDBDatabase> {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open('sys-design-tool', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('documents')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => {
        database = undefined
        reject(request.error)
      }
      request.onblocked = () => {
        database = undefined
        reject(new Error('Close other system design tabs and reload.'))
      }
    })
  return database
}
export async function loadDraft(): Promise<{ record?: RecordData; recovered: boolean }> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readonly'),
      store = tx.objectStore('documents')
    const current = store.get('current'),
      previous = store.get('previous')
    tx.oncomplete = () => {
      try {
        if (!current.result) return resolve({ recovered: false })
        resolve({
          record: { doc: parseDocument(current.result.doc), revision: current.result.revision },
          recovered: false,
        })
      } catch {
        try {
          resolve({
            record: {
              doc: parseDocument(previous.result.doc),
              revision: current.result?.revision ?? 0,
            },
            recovered: true,
          })
        } catch {
          reject(new Error('The saved draft could not be recovered. Import a backup to continue.'))
        }
      }
    }
    tx.onerror = () => reject(tx.error)
  })
}
export async function saveDraft(doc: DesignDocument, expectedRevision: number): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('documents', 'readwrite'),
      store = tx.objectStore('documents')
    const req = store.get('current')
    let reason: Error | null = null
    req.onsuccess = () => {
      const current = req.result as RecordData | undefined
      if ((current?.revision ?? 0) !== expectedRevision) {
        reason = new ConflictError()
        tx.abort()
        return
      }
      if (current) store.put(current, 'previous')
      store.put({ doc, revision: expectedRevision + 1 }, 'current')
    }
    tx.oncomplete = () => resolve(expectedRevision + 1)
    tx.onabort = () => reject(reason ?? tx.error ?? new Error('Could not save the document.'))
    tx.onerror = () => reject(tx.error)
  })
}
