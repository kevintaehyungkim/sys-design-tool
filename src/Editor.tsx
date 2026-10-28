import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension, markInputRule, markPasteRule } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Heading from '@tiptap/extension-heading'
import Code from '@tiptap/extension-code'
import Placeholder from '@tiptap/extension-placeholder'
import { TextSelection } from '@tiptap/pm/state'
import { canSplit } from '@tiptap/pm/transform'
import { Code2, Type, List, ListOrdered, Heading3 } from 'lucide-react'
import { fromPlainText, type RichText } from './model'
export const SectionHeading = Heading.extend({
  addInputRules() {
    return []
  },
}).configure({ levels: [3] })
export const InlineCode = Code.extend({
  addInputRules() {
    return [markInputRule({ find: /(?<![\\`])`([^`\n]+)(?<!\\)`$/, type: this.type })]
  },
  addPasteRules() {
    return [markPasteRule({ find: /(?<![\\`])`([^`\n]+)(?<!\\)`(?!`)/g, type: this.type })]
  },
})
// Preserve the useful single-backtick shortcut without introducing fenced blocks or implicit headings.
export function editorExtensions(placeholder = 'Start writing…') {
  return [
    StarterKit.configure({
      heading: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      link: false,
      underline: false,
      trailingNode: false,
    }),
    SectionHeading,
    InlineCode,
    Placeholder.configure({ placeholder }),
    Extension.create({
      name: 'codeExit',
      priority: 1200,
      addKeyboardShortcuts() {
        return {
          Enter: () => {
            if (!this.editor.isActive('heading')) return false
            return this.editor.commands.command(({ tr }) => {
              tr.deleteSelection()
              const pos = tr.selection.from,
                types = [{ type: this.editor.schema.nodes.paragraph }]
              if (!canSplit(tr.doc, pos, 1, types)) return false
              tr.split(pos, 1, types)
              tr.setSelection(TextSelection.near(tr.doc.resolve(pos + 1)))
              tr.setStoredMarks([])
              return true
            })
          },
          'Mod-z': () => this.editor.commands.undoInputRule() || this.editor.commands.undo(),
          ArrowRight: () => {
            const { selection } = this.editor.state
            if (
              selection.empty &&
              this.editor.isActive('code') &&
              !selection.$from.nodeAfter?.marks.some((m) => m.type.name === 'code')
            )
              return this.editor.commands.unsetCode()
            return false
          },
        }
      },
    }),
  ]
}
export function RichEditor({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: RichText
  onChange: (value: RichText) => void
  label: string
  placeholder?: string
}) {
  const callback = useRef(onChange)
  callback.current = onChange
  const [, refresh] = useState(0)
  const editor = useEditor({
    extensions: editorExtensions(placeholder),
    content: value,
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': label,
        'aria-multiline': 'true',
        spellcheck: 'false',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (!event.clipboardData?.getData('text/html') && /(^|\n)\s*- |`/.test(text)) {
          editor?.commands.insertContent(fromPlainText(text).content!)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor }) => callback.current(editor.getJSON()),
    onSelectionUpdate: () => refresh((n) => n + 1),
    onTransaction: () => refresh((n) => n + 1),
  })
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value))
      editor.commands.setContent(value, { emitUpdate: false })
  }, [value, editor])
  const style = editor?.isActive('heading')
    ? 'heading'
    : editor?.isActive('bulletList')
      ? 'bullet'
      : editor?.isActive('orderedList')
        ? 'numbered'
        : 'body'
  function changeStyle(value: string) {
    if (!editor) return
    const chain = editor.chain().focus()
    if (value === 'bullet') chain.toggleBulletList().run()
    else if (value === 'numbered') chain.toggleOrderedList().run()
    else {
      if (editor.isActive('bulletList')) chain.toggleBulletList()
      if (editor.isActive('orderedList')) chain.toggleOrderedList()
      if (value === 'heading') chain.setHeading({ level: 3 }).run()
      else chain.setParagraph().run()
    }
  }
  const StyleIcon =
    style === 'heading'
      ? Heading3
      : style === 'bullet'
        ? List
        : style === 'numbered'
          ? ListOrdered
          : Type
  return (
    <div className="rich-editor">
      <div className="editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
        <StyleIcon size={15} />
        <select
          aria-label={`${label} text style`}
          value={style}
          onChange={(e) => changeStyle(e.target.value)}
        >
          <option value="body">Body text</option>
          <option value="heading">Section heading</option>
          <option value="bullet">Bulleted list</option>
          <option value="numbered">Numbered list</option>
        </select>
        <button
          type="button"
          title="Inline code · paired backticks"
          aria-label={`${label} inline code`}
          aria-pressed={editor?.isActive('code') ?? false}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <Code2 size={15} />
        </button>
        <span className="editor-tip">Type − then space for bullets</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
