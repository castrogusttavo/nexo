'use client'

import { useEditorRef, useEditorSelector } from "platejs/react"
import { ToolbarButton } from "./toolbar"
import { Redo2, Undo2 } from "lucide-react"

// With YjsPlugin active, editor.undo()/editor.redo() are swapped by
// withTYHistory (@platejs/yjs) for versions that operate on their own
// Y.UndoManager — editor.history.undos/redos (plain Slate) stop reflecting
// the real history state. Uses the Yjs stack when it exists.
function getUndoRedoLength(
  editor: { history: { undos: unknown[]; redos: unknown[] } } & Record<string, unknown>,
  kind: 'undo' | 'redo'
): number {
  const yUndoManager = editor.undoManager as
    | { undoStack: unknown[]; redoStack: unknown[] }
    | undefined
  if (yUndoManager) {
    return kind === 'undo'
      ? yUndoManager.undoStack.length
      : yUndoManager.redoStack.length
  }
  return kind === 'undo' ? editor.history.undos.length : editor.history.redos.length
}

export function RedoToolbarButton(
  props: React.ComponentProps<typeof ToolbarButton>
) {
  const editor = useEditorRef()
  const disabled = useEditorSelector(
    (editor) => getUndoRedoLength(editor, 'redo') === 0,
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
    (editor) => getUndoRedoLength(editor, 'undo') === 0,
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
