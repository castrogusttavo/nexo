'use client'

import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export const MermaidDiagram = Node.create({
  name: 'mermaidDiagram',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      source: { default: 'graph TD\n  A[Início] --> B[Fim]' },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView)
  },
})

function MermaidView({ node, updateAttributes }: NodeViewProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.attrs.source as string)
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const rawId = useId().replace(/:/g, '')

  useEffect(() => {
    if (editing) return
    let cancelled = false

    import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: 'neutral' })
      mermaid
        .render(`mermaid-${rawId}`, node.attrs.source as string)
        .then(({ svg }) => {
          if (!cancelled) {
            setSvg(svg)
            setError(null)
          }
        })
        .catch((err: Error) => {
          if (!cancelled) setError(err.message)
        })
    })

    return () => {
      cancelled = true
    }
  }, [editing, node.attrs.source, rawId])

  if (editing) {
    return (
      <NodeViewWrapper>
        <div className='flex flex-col gap-2 rounded-md border border-border p-2'>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={6}
            className='resize-y font-mono text-xs'
          />
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => {
                setDraft(node.attrs.source as string)
                setEditing(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              type='button'
              size='sm'
              onClick={() => {
                updateAttributes({ source: draft })
                setEditing(false)
              }}
            >
              Renderizar
            </Button>
          </div>
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <div
        className='cursor-pointer rounded-md border border-border p-3'
        onClick={() => setEditing(true)}
      >
        {error ? (
          <span className='text-destructive text-xs'>Erro no diagrama: {error}</span>
        ) : svg ? (
          // SVG vem do mermaid.render (mermaid sanitiza por padrão), não de HTML externo arbitrário
          <div dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <span className='text-muted-foreground text-xs'>Renderizando...</span>
        )}
      </div>
    </NodeViewWrapper>
  )
}
