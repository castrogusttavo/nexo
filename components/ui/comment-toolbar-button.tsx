'use client'

import { createId } from '@paralleldrive/cuid2'
import { getCommentKey } from '@platejs/comment'
import { MessageSquarePlusIcon } from 'lucide-react'
import { TextApi } from 'platejs'
import { useEditorRef } from 'platejs/react'
import { discussionPlugin } from '@/components/editor/plugins/discussion-plugin'
import { ToolbarButton } from './toolbar'

export function CommentToolbarButton() {
  const editor = useEditorRef()

  return (
    <ToolbarButton
      tooltip='Comentar'
      onClick={() => {
        if (!editor.selection || editor.api.isCollapsed()) return

        const id = createId()
        editor.tf.setNodes(
          { comment: true, [getCommentKey(id)]: true },
          { match: TextApi.isText, split: true },
        )
        editor.setOption(discussionPlugin, 'activeId', id)
      }}
    >
      <MessageSquarePlusIcon />
    </ToolbarButton>
  )
}
