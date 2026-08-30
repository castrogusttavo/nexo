'use client'

import { toggleCodeBlock } from "@platejs/code-block"
import { KEYS, NodeEntry, Path, TElement } from "platejs"
import { PlateEditor } from "platejs/react"

const setList = (
  editor: PlateEditor,
  type: string,
  entry: NodeEntry<TElement>
) => {
  editor.tf.setNodes(
    editor.api.create.block({ indent: 1, listStyleType: type }),
    { at: entry[1] }
  )
}

const setBlockMap: Record<
  string,
  (editor: PlateEditor, type: string, entry: NodeEntry<TElement>) => void
> = {
  [KEYS.listTodo]: setList,
  [KEYS.ol]: setList,
  [KEYS.ul]: setList,
  [KEYS.codeBlock]: (editor) => toggleCodeBlock(editor)
}

export const setBlockType = (
  editor: PlateEditor,
  type: string,
  { at }: { at?: Path } = {}
) => {
  editor.tf.withoutNormalizing(() => {
    if (type === KEYS.blockquote) {
      const target = at ?? editor.selection
      if (!target || editor.api.some({ at: target, match: { type } })) {
        return
      }
      editor.tf.toggleBlock(type, { ...(at ? { at } : {}), wrap: true })
      return
    }

    const setEntry = (entry: NodeEntry<TElement>) => {
      const [node, path] = entry
      if (node[KEYS.listType]) {
        editor.tf.unsetNodes([KEYS.listType, 'indent'], { at: path })
      }
      if (type in setBlockMap) {
        return setBlockMap[type](editor, type, entry)
      }
      if (node.type !== type) {
        editor.tf.setNodes({ type }, { at: path })
      }
    }

    if (at) {
      const entry = editor.api.node<TElement>(at)
      if (entry) {
        setEntry(entry)
        return
      }
    }

    const entries = editor.api.blocks({ mode: 'lowest' })
    entries.forEach((entry) => {
      setEntry(entry)
    })
  })
}

export const getBlockType = (block: TElement) => {
  if (block[KEYS.listType]) {
    if (block[KEYS.listType] === KEYS.ol) return KEYS.ol
    if (block[KEYS.listType] === KEYS.listTodo) return KEYS.listTodo
    return KEYS.ul
  }
  return block.type
}
