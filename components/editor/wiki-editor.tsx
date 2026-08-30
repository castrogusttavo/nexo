'use client'

import { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { BasicNodesKit } from "./plugins/basic-nodes-kit"
import { ListKit } from "./plugins/list-kit"
import { CodeBlockKit } from "./plugins/code-block-kit"
import { FontKit } from "./plugins/font-kit"
import { BlockMenuKit } from "./plugins/block-menu-kit"
import { FixedToolbarKit } from "./plugins/fixed-toolbar-kit"
import { FloatingToolbarKit } from "./plugins/floating-toolbar-kit"
import { CursorOverlayKit } from "./plugins/cursor-overlay-kit"
import { createYjsKit } from "./plugins/yjs-kit"
import { cn } from "@/lib/utils"
import { Editor, EditorContainer } from "../ui/editor"
import { CursorOverlay } from "../ui/cursor-overlay"

// Cor determinística por usuário — mesmo userId, mesmo cursor remoto sempre.
function colorFromUserId(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360}, 70%, 50%)`
}

interface WikiPageRichEditorProps {
  documentName: string
  userId: string
  userName: string
  content: Value
  onChange: (content: Value) => void
  className?: string
}

export function WikiPageRichEditor({
  documentName,
  userId,
  userName,
  content,
  onChange,
  className
}: WikiPageRichEditorProps) {
  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ...ListKit,
      ...CodeBlockKit,
      ...FontKit,
      ...CursorOverlayKit,
      ...BlockMenuKit,
      ...FixedToolbarKit,
      ...FloatingToolbarKit,
      ...createYjsKit({
        documentName,
        userName,
        userColor: colorFromUserId(userId),
      }),
    ],
    value: content,
    skipInitialization: true,
  })

  return (
    <Plate editor={editor} onChange={({ value }) => onChange(value)}>
      <div className={cn('flex h-full flex-col no-scrollbar', className)}>
        <EditorContainer className='min-h-0 flex-1 no-scrollbar'>
          <Editor placeholder='Digite algo...' />
          <CursorOverlay />
        </EditorContainer>
      </div>
    </Plate>
  )
}
