'use client'

import { useEditorMediaUrl } from "@/src/hooks/use-editor-media"
import { Skeleton } from "@/components/ui/skeleton"
import { mergeAttributes, Node, NodeViewProps, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react"

export interface EditorMediaOptions {
  workspaceId: string
  projectSlug: string
}

export const EditorVideo = Node.create<EditorMediaOptions>({
  name: 'editorVideo',
  group: 'block',
  atom: true,

  addOptions() {
    return { workspaceId: '', projectSlug: '' }
  },

  addAttributes() {
    return {
      mediaKey: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-editor-video]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-editor-video': '' })]
  },

  addNodeView() {
    const options = this.options
    return ReactNodeViewRenderer((props: NodeViewProps) => (
      <VideoNodeView {...props} options={options} />
    ))
  },
})

function VideoNodeView({ node, options }: NodeViewProps & { options: EditorMediaOptions } ) {
  const mediaKey = node.attrs.mediaKey as string | null
  const { data } = useEditorMediaUrl(options.workspaceId, options.projectSlug, mediaKey ?? undefined)

  return (
    <NodeViewWrapper>
      {data?.url ? (
        <video src={data.url} controls className='max-w-full rounded-md' />
      ) : (
        <Skeleton className='h-48 w-full' />
      )}
    </NodeViewWrapper>
  )
}
