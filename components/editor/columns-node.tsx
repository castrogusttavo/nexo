'use client'

import { mergeAttributes, Node, NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"

export const Column = Node.create({
  name: 'column',
  group: 'column',
  content: 'block+',

  parseHTML() {
    return [{ tag: 'div[data-column]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-column': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper
        className="min-w-0 rounded-md border border-border p-2"
        style={{ flex: '1 1 0%', minWidth: 0 }}
      >
        <NodeViewContent />
      </NodeViewWrapper>
    ))
  }
})

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',

  parseHTML() {
    return [{ tag: 'div[data-columns]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-columns': '' }), 0]
  },

  addNodeView() {
    return ReactNodeViewRenderer(() => (
      <NodeViewWrapper style={{ display: 'flex', gap: '0.75rem' }}>
        <NodeViewContent style={{ display: 'flex', flex: 1, gap: '0.75rem' }} />
      </NodeViewWrapper>
    ))
  }
})
