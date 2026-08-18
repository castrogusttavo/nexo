'use client'

import { useEditorMediaUrl } from "@/src/hooks/use-editor-media"
import { Skeleton } from "@/components/ui/skeleton"
import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"

export interface EditorMediaOptions {
  workspaceId: string
  projectSlug: string
}

export const EditorImage = Node.create<EditorMediaOptions>({
  name: 'editorImage',
  group: 'block',
  atom: true,

  addOptions() {
    return { workspaceId: '', projectSlug: '' }
  },

  addAttributes() {
    return {
      mediaKey: { default: null },
      alt: { default: null }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-editor-image]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-editor-image': '' })]
  },

  addNodeView() {
    const options = this.options
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <ImageNodeView {...props} options={options} />
    ))
  },
})

function ImageNodeView({ node, options }: NodeViewProps & { options: EditorMediaOptions }) {
  const mediaKey = node.attrs.mediaKey as string | null
  const { data } = useEditorMediaUrl(options.workspaceId, options.projectSlug, mediaKey ?? undefined)

  return (
    <NodeViewWrapper>
      {data?.url ? (
        <img src={data.url} alt={node.attrs.alt ?? ''} className='max-w-full rounded-md' />
      ) : (
        <Skeleton className='h-32 w-full' />
      )}
    </NodeViewWrapper>
  )
}
