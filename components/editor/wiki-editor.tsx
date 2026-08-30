'use client'

import { Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { BasicNodesKit } from "./plugins/basic-nodes-kit"
import { ListKit } from "./plugins/list-kit"
import { CodeBlockKit } from "./plugins/code-block-kit"
import { CursorOverlayKit } from "./plugins/cursor-overlay-kit"
import { createYjsKit } from "./plugins/yjs-kit"
import { FixedToolbar } from "../ui/fixed-toolbar"
import { cn } from "@/lib/utils"
import { ToolbarButton } from "../ui/toolbar"
import { NexoIcon } from "../icon/icon"
import { Heading01Icon, Heading02Icon, Heading03Icon, QuoteDownIcon, TextBoldIcon, TextItalicIcon, TextStrikethroughIcon, TextUnderlineIcon } from "@hugeicons-pro/core-stroke-rounded"
import { BulletedListToolbarButton, NumberedListToolbarButton, TodoListToolbarButton } from "../ui/list-toolbar-button"
import { MarkToolbarButton } from "../ui/mark-toolbar-button"
import { Editor, EditorContainer } from "../ui/editor"

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
      ...CursorOverlayKit,
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
        <FixedToolbar className="justify-start gap-0.5 rounded-t-lg border-b border-border">
          <ToolbarButton
            onClick={() => editor.tf.h1.toggle()}
            tooltip='Título 1'
          >
            <NexoIcon icon={Heading01Icon} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.tf.h2.toggle()}
            tooltip='Título 2'
          >
            <NexoIcon icon={Heading02Icon} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.tf.h3.toggle()}
            tooltip='Título 3'
          >
            <NexoIcon icon={Heading03Icon} strokeWidth={2} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.tf.blockquote.toggle()}
            tooltip='Citação'
          >
            <NexoIcon icon={QuoteDownIcon} strokeWidth={2} />
          </ToolbarButton>
          <BulletedListToolbarButton />
          <NumberedListToolbarButton />
          <TodoListToolbarButton />
          <MarkToolbarButton nodeType='bold' tooltip='Negrito' command='cmd+B'>
            <NexoIcon icon={TextBoldIcon} strokeWidth={2} />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType='italic' tooltip='Itálico' command='cmd+I'>
            <NexoIcon icon={TextItalicIcon} strokeWidth={2} />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType='underline' tooltip='Sublinhado' command='cmd+U'>
            <NexoIcon icon={TextUnderlineIcon} strokeWidth={2} />
          </MarkToolbarButton>
          <MarkToolbarButton nodeType='strikethrough' tooltip='Riscado' command='cmd+S'>
            <NexoIcon icon={TextStrikethroughIcon} strokeWidth={2} />
          </MarkToolbarButton>
        </FixedToolbar>
        <EditorContainer className='min-h-0 flex-1 no-scrollbar'>
          <Editor placeholder='Digite algo...' />
        </EditorContainer>
      </div>
    </Plate>
  )
}
