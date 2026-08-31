'use client'

import { useEditorRef, useEditorSelector } from "platejs/react"
import { ToolbarButton } from "./toolbar"
import { Redo2, Undo2 } from "lucide-react"

// Com o YjsPlugin ativo, editor.undo()/editor.redo() são trocados pelo
// withTYHistory (@platejs/yjs) por versões que operam sobre um Y.UndoManager
// próprio — editor.history.undos/redos (Slate puro) param de refletir o
// estado real do histórico. Usa a pilha do Yjs quando ela existir.
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
