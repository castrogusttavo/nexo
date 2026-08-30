'use client'

import { useEditorRef, useEditorSelector } from "platejs/react"
import { ToolbarButton } from "./toolbar"
import { Redo2, Undo2 } from "lucide-react"

export function RedoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef()
  const disabled = useEditorSelector(
    (editor) => editor.history.redos.length === 0,
    []
  )

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.redo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip='Refazer'
    >
      <Redo2 />
    </ToolbarButton>
  )
}


export function UndoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef()
  const disabled = useEditorSelector(
    (editor) => editor.history.undos.length === 0,
    []
  )

  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.undo()}
      onMouseDown={(e) => e.preventDefault()}
      tooltip='Desfazer'
    >
      <Undo2 />
    </ToolbarButton>
  )
}
