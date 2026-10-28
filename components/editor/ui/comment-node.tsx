'use client'

import { CommentPlugin } from '@platejs/comment/react'
import { MessageSquareTextIcon } from 'lucide-react'
import type { TCommentText } from 'platejs'
import type { PlateLeafProps } from 'platejs/react'
import { PlateLeaf, useEditorRef, usePluginOption } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { useWikiComments } from '@/src/hooks/use-wiki-comment'
import { useWikiEditorContext } from '@/src/hooks/use-wiki-editor-context'
import { cn } from '@/lib/utils'

export function CommentLeaf(props: PlateLeafProps<TCommentText>) {
  const { children, leaf } = props
  const editor = useEditorRef()
  const { workspaceId, wikiPageId } = useWikiEditorContext()
  const id = editor.getApi(CommentPlugin).comment.nodeId(leaf)
  const activeId = usePluginOption(discussionPlugin, 'activeId')
  const isActive = !!id && activeId === id
  const { data: comments = [] } = useWikiComments(workspaceId, wikiPageId)
  const count = id ? comments.filter((c) => c.markId === id).length : 0

  return (
    <PlateLeaf
      {...props}
      className={cn(
        'cursor-pointer border-b-2 border-b-highlight/[.36] bg-highlight/[.13] transition-colors duration-200',
        isActive && 'border-b-highlight bg-highlight/25',
      )}
      attributes={{
        ...props.attributes,
        onClick: () => {
          if (id) editor.setOption(discussionPlugin, 'activeId', id)
        },
      }}
    >
      {children}
      {count > 0 && (
        <span
          contentEditable={false}
          className='ml-0.5 inline-flex h-4 cursor-pointer select-none items-center gap-0.5 align-middle text-muted-foreground/80'
          onClick={(event) => {
            event.stopPropagation()
            if (id) editor.setOption(discussionPlugin, 'activeId', id)
          }}
        >
          <MessageSquareTextIcon className='size-3 shrink-0' />
          <span className='font-semibold text-[10px]'>{count}</span>
        </span>
      )}
    </PlateLeaf>
  )
}
