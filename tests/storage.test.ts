import 'fake-indexeddb/auto'
import { expect, it } from 'vitest'
import { blankDocument } from '../src/model'
import { ConflictError, loadDraft, saveDraft } from '../src/storage'
it('saves atomically, preserves the previous save and rejects a stale writer', async () => {
  expect((await loadDraft()).record).toBeUndefined()
  const doc = blankDocument()
  doc.title = 'Original'
  expect(await saveDraft(doc, 0)).toBe(1)
  const outcomes = await Promise.allSettled([
    saveDraft({ ...doc, title: 'First writer' }, 1),
    saveDraft({ ...doc, title: 'Stale writer' }, 1),
  ])
  expect(outcomes.filter((o) => o.status === 'fulfilled')).toHaveLength(1)
  const rejected = outcomes.find((o) => o.status === 'rejected') as PromiseRejectedResult
  expect(rejected.reason).toBeInstanceOf(ConflictError)
  expect((await loadDraft()).record!.doc.title).toBe('First writer')
  const db = await new Promise<IDBDatabase>((resolve) => {
    const r = indexedDB.open('sys-design-tool', 1)
    r.onsuccess = () => resolve(r.result)
  })
  await new Promise<void>((resolve) => {
    const t = db.transaction('documents', 'readwrite')
    t.objectStore('documents').put({ revision: 2, doc: { broken: true } }, 'current')
    t.oncomplete = () => resolve()
  })
  const recovered = await loadDraft()
  expect(recovered.recovered).toBe(true)
  expect(recovered.record!.doc.title).toBe('Original')
  expect(recovered.record!.revision).toBe(2)
  db.close()
})
