'use client'

import type { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { Editor, EditorContainer } from "../ui/editor"
import { cn } from "@/lib/utils"

interface IssueRichEditorProps {
  content: Value
  onChange: (content: Value) => void
  className?: string
}

export function IssueRichEditor({ content, onChange, className }: IssueRichEditorProps) {
  const editor = usePlateEditor({
    value: content
  })

  return (
    <Plate editor={editor} onChange={({ value }) => onChange(value)}>
      <EditorContainer>
        <Editor className={cn('typeset', className)} placeholder='Digite algo...' />
      </EditorContainer>
    </Plate>
  )
}
