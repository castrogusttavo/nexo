'use client'

import { CommentPlugin } from '@platejs/comment/react'
import type { TCommentText } from 'platejs'
import type { PlateLeafProps } from 'platejs/react'
import { PlateLeaf, useEditorRef, usePluginOption } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { cn } from '@/lib/utils'

export function CommentLeaf(props: PlateLeafProps<TCommentText>) {
  const { children, leaf } = props
  const editor = useEditorRef()
  const id = editor.getApi(CommentPlugin).comment.nodeId(leaf)
  const activeId = usePluginOption(discussionPlugin, 'activeId')
  const isActive = !!id && activeId === id

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
    </PlateLeaf>
  )
}
