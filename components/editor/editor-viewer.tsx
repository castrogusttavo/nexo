'use client'

import { cn } from "@/lib/utils"
import { EditorContent, JSONContent, useEditor } from "@tiptap/react"
import { getEditorExtensions } from "./extensions"

interface EditorViewerProps {
  content: JSONContent
  className?: string
  workspaceId: string
  projectSlug: string
}

export function EditorViewer({ content, className, workspaceId, projectSlug }: EditorViewerProps) {
  const editor = useEditor({
    extensions: getEditorExtensions({ workspaceId, projectSlug }),
    content,
    editable: false,
    immediatelyRender: false
  })

  return (
    <EditorContent
      editor={editor}
      className={cn('tiptap typeset max-w-none', className)}
    />
  )
}
