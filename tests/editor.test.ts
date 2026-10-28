// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import { editorExtensions } from '../src/Editor'
const editors: Editor[] = []
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON() {},
  })
})
afterEach(() => {
  editors.splice(0).forEach((e) => e.destroy())
  document.body.innerHTML = ''
})
function make() {
  const el = document.createElement('div')
  document.body.append(el)
  const e = new Editor({ element: el, extensions: editorExtensions(), content: '<p></p>' })
  editors.push(e)
  return e
}
function press(editor: Editor, key: string) {
  editor.view.someProp('handleKeyDown', (fn) =>
    fn(editor.view, new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
  )
}
function type(editor: Editor, text: string) {
  for (const ch of text) {
    const { from, to } = editor.state.selection
    const handled = editor.view.someProp('handleTextInput', (fn) =>
      fn(editor.view, from, to, ch, () => editor.state.tr.insertText(ch, from, to)),
    )
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(ch, from, to))
  }
}
describe('live writing rules', () => {
  it('makes a real round-bullet list from hyphen-space, then exits an empty item', () => {
    const e = make()
    type(e, '- First')
    expect(e.getJSON().content![0].type).toBe('bulletList')
    press(e, 'Enter')
    expect(e.getJSON().content![0].content).toHaveLength(2)
    press(e, 'Enter')
    expect(e.getJSON().content!.at(-1)!.type).toBe('paragraph')
  })
  it('converts a closing backtick immediately, keeping following typing plain', () => {
    const e = make()
    type(e, 'Use `cache-aside` safely')
    const content = e.getJSON().content![0].content!
    expect(content[1]).toMatchObject({ text: 'cache-aside', marks: [{ type: 'code' }] })
    expect(content.at(-1)!).toEqual({ type: 'text', text: ' safely' })
  })
  it('does not infer headings from capitals, and Enter after an explicit heading creates body text', () => {
    const e = make()
    type(e, 'FUNCTIONAL')
    expect(e.getJSON().content![0].type).toBe('paragraph')
    e.commands.setHeading({ level: 3 })
    press(e, 'Enter')
    type(e, 'Some body text')
    expect(e.getJSON().content!.map((n) => n.type)).toEqual(['heading', 'paragraph'])
  })
  it('splits a heading mid-line with its remainder as body', () => {
    const e = make()
    type(e, 'FirstSecond')
    e.commands.setHeading({ level: 3 })
    e.commands.setTextSelection(6)
    press(e, 'Enter')
    expect(e.getJSON().content!.map((n) => n.type)).toEqual(['heading', 'paragraph'])
    expect(e.getJSON().content![1].content![0].text).toBe('Second')
  })
  it('keeps escaped, empty and fenced backticks literal', () => {
    for (const s of ['\\`literal`', '`literal\\`', '``', '```code```']) {
      const e = make()
      type(e, s)
      expect(e.getJSON().content![0].content!.every((n) => !n.marks)).toBe(true)
    }
  })
  it('does not create bullets inside an explicit heading', () => {
    const e = make()
    e.commands.setHeading({ level: 3 })
    type(e, '- ')
    expect(e.getJSON().content![0].type).toBe('heading')
  })
  it('undo restores a just-converted bullet prefix', () => {
    const e = make()
    type(e, '- ')
    e.commands.undoInputRule()
    expect(e.getText()).toBe('- ')
    expect(e.getJSON().content![0].type).toBe('paragraph')
  })
})
