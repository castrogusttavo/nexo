'use client'

import katex from 'katex'
import 'katex/dist/katex.min.css'
import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useState } from 'react';
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function renderKatex(source: string, displayMode: boolean): { html: string; error: string | null } {
  try {
    return { html: katex.renderToString(source, { throwOnError: true, displayMode }), error: null }
  } catch (error) {
    return { html: '', error: error instanceof Error ? error.message : 'Erro na equação' }
  }
}

export const InlineEquation = Node.create({
  name: 'inlineEquation',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return { source: { default: 'x^2' } }
  },

  parseHTML() {
    return [{ tag: 'span[data-inline-equation]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-inline-equation': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <EquationView {...props} displayMode={false} />
    ))
  }
})

export const BlockEquation = Node.create({
  name: 'blockEquation',
  group: 'block',
  atom: true,

  addAttributes() {
    return { source: { default: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-block-equation]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-block-equation': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <EquationView {...props} displayMode={true} />
    ))
  }
})

function EquationView({
  node,
  updateAttributes,
  displayMode
}: NodeViewProps & { displayMode: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.attrs.source as string)

  if (editing) {
    return (
      <NodeViewWrapper as={displayMode ? 'div' : 'span'}>
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            updateAttributes({ source: draft })
            setEditing(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              updateAttributes({ source: draft })
              setEditing(false)
            }
            if (event.key === 'Escape') {
              setDraft(node.attrs.source as string)
              setEditing(false)
            }
          }}
          className={cn('h-7 bg-muted font-mono text-xs', !displayMode && 'w-auto min-w-32')}
        />
      </NodeViewWrapper>
    )
  }

  const { html, error } = renderKatex(node.attrs.source as string, displayMode)

  return (
    <NodeViewWrapper as={displayMode ? 'div' : 'span'}>
      <span
        onClick={() => setEditing(true)}
        className={`cursor-pointer rounded-sm ${error ? 'text-destructive text-xs' : ''} ${displayMode ? 'block py-2': ''}`}
      >
        {error ? `Erro: ${error}` : <span dangerouslySetInnerHTML={{ __html: html }} />}
      </span>
    </NodeViewWrapper>
  )
}
