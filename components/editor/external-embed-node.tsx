'use client'

import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

export interface ExternalEmbedOptions {
  workspaceId: string
  projectSlug: string
}

export const ExternalEmbed = Node.create<ExternalEmbedOptions>({
  name: 'externalEmbed',
  group: 'block',
  atom: true,

  addOptions() {
    return { workspaceId: '', projectSlug: '' }
  },

  addAttributes() {
    return {
      provider: { default: null },
      label: { default: null },
      embedUrl: { default: null },
      sourceUrl: { default: null },
      thumbnailKey: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-external-embed]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-external-embed' : '' })]
  },

  addNodeView() {
    const options = this.options
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <ExternalEmbedView {...props} options={options} />
    ))
  }
})

function ExternalEmbedView({ node, options }: NodeViewProps & { options: ExternalEmbedOptions }) {
  const [loaded, setLoaded] = useState(false)
  const { label, embedUrl, sourceUrl, thumbnailKey } = node.attrs as {
    provider: string
    label: string
    embedUrl: string
    sourceUrl: string
    thumbnailKey: string | null
  }

  if (loaded) {
    return (
      <NodeViewWrapper>
        <iframe
          src={embedUrl}
          className="aspect-video w-full rounded-md border border-border"
          sandbox='allow-scripts allow-same-origin allow-popups allow-forms'
          referrerPolicy="origin"
          title={label}
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper>
      <button
        type='button'
        onClick={() => setLoaded(true)}
        className='relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted'
      >
        {thumbnailKey ? (
          <img
            src={`/api/workspaces/${options.workspaceId}/projects/${options.projectSlug}/embed-thumbnails/${thumbnailKey}`}
            alt={label}
            className='h-full w-full object-cover'
          />
        ) : (
          <span className='text-muted-foreground text-sm'>{label}</span>
        )}
        <Badge variant='secondary' className='absolute bottom-2 left-2 bg-background/90'>
          {label} · {sourceUrl}
        </Badge>
      </button>
    </NodeViewWrapper>
  )
}
