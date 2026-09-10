'use client'

import { useEffect, useState } from "react"
import { KEYS, Value } from "platejs"
import { Plate, usePlateEditor } from "platejs/react"
import { YjsPlugin } from "@platejs/yjs/react"
import { BasicNodesKit } from "./plugins/basic-nodes-kit"
import { ListKit } from "./plugins/list-kit"
import { CodeBlockKit } from "./plugins/code-block-kit"
import { AlignKit } from "./plugins/align-kit"
import { FontKit } from "./plugins/font-kit"
import { LineHeightKit } from "./plugins/line-height-kit"
import { BlockMenuKit } from "./plugins/block-menu-kit"
import { FixedToolbarKit } from "./plugins/fixed-toolbar-kit"
import { FloatingToolbarKit } from "./plugins/floating-toolbar-kit"
import { CursorOverlayKit } from "./plugins/cursor-overlay-kit"
import { createYjsKit } from "./plugins/yjs-kit"
import { useMounted } from "@/components/hooks/use-mounted"
import { cn } from "@/lib/utils"
import { Editor, EditorContainer } from "../ui/editor"
import { CursorOverlay } from "../ui/cursor-overlay"
import { ColumnKit } from "./plugins/column-kit"
import { ToggleKit } from "./plugins/toggle-kit"
import { TocKit } from "./plugins/toc-kit"
import { MediaKit } from "./plugins/media-kit"
import { DndKit } from "./plugins/dnd-kit"
import { LinkKit } from "./plugins/link-kit"
import { DateKit } from "./plugins/date-kit"
import { MathKit } from "./plugins/math-kit"
import { EmojiKit } from "./plugins/emoji-kit"
import { MentionKit } from "./plugins/mention-kit"
import { SlashKit } from "./plugins/slash-kit"
import { TableKit } from "./plugins/table-kit"
import { CodeDrawingKit } from "./plugins/code-drawing-kit"
import { ExcalidrawKit } from "./plugins/excalidraw-kit"
import { FootnoteKit } from "./plugins/footnote-kit"
import { MarkdownKit } from "./plugins/markdown-kit"
import { DocxKit } from "./plugins/docx-kit"
import { CommentKit } from "./plugins/comment-kit"
import { DiscussionKit } from "./plugins/discussion-kit"
import { WikiEditorProvider } from "@/src/hooks/use-wiki-editor-context"

// Deterministic color per user — same userId, same remote cursor always.
function colorFromUserId(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${hash % 360}, 70%, 50%)`
}

interface WikiPageRichEditorProps {
  documentName: string
  workspaceId: string
  userId: string
  userName: string
  content: Value
  onChange: (content: Value) => void
  className?: string
}

export function WikiPageRichEditor({
  documentName,
  workspaceId,
  userId,
  userName,
  content,
  onChange,
  className
}: WikiPageRichEditorProps) {
  const [isSynced, setIsSynced] = useState(false)

  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ...ListKit,
      ...CodeBlockKit,
      ...ColumnKit,
      ...ToggleKit,
      ...TocKit,
      ...MediaKit,
      ...LinkKit,
      ...DateKit,
      ...MathKit,
      ...EmojiKit,
      ...MentionKit,
      ...SlashKit,
      ...TableKit,
      ...CodeDrawingKit,
      ...ExcalidrawKit,
      ...FootnoteKit,
      ...MarkdownKit,
      ...DocxKit,
      ...CommentKit,
      ...DiscussionKit,
      ...AlignKit,
      ...FontKit,
      ...LineHeightKit,
      ...CursorOverlayKit,
      ...BlockMenuKit,
      ...DndKit,
      ...FixedToolbarKit,
      ...FloatingToolbarKit,
      ...createYjsKit({
        documentName,
        userName,
        userColor: colorFromUserId(userId),
        onSyncChange: setIsSynced,
      }),
    ],
    value: content,
    skipInitialization: true,
  })

  const mounted = useMounted()

  useEffect(() => {
    if (!mounted) return

    let cancelled = false

    // Opening the WebSocket while the page is still loading (fonts,
    // HMR, analytics scripts competing for the connection) makes the browser
    // drop the connection ("interrupted while the page was loading"). Waits
    // for loading to actually finish before connecting.
    function start() {
      if (cancelled) return
      editor.getApi(YjsPlugin).yjs.init({
        id: documentName,
        value: content,
      })
    }

    if (document.readyState === 'complete') {
      start()
    } else {
      window.addEventListener('load', start, { once: true })
    }

    return () => {
      cancelled = true
      window.removeEventListener('load', start)
      editor.getApi(YjsPlugin).yjs.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, documentName, mounted])

  return (
    <WikiEditorProvider
      workspaceId={workspaceId}
      wikiPageId={documentName}
      userId={userId}
      userName={userName}
    >
      <Plate
        editor={editor}
        onChange={({ value }) => {
          // Ctrl+A -> Del can zero out editor.children before Slate's
          // normalization runs (Yjs init disables the default normalization,
          // see yjs.init()). An empty document breaks rendering
          // — never let this propagate to autosave or the rest of the tree.
          if (value.length === 0) {
            editor.tf.insertNodes(editor.api.create.block({ type: KEYS.p }), {
              at: [0],
            })
            return
          }
          onChange(value)
        }}
      >
        <div className={cn('flex h-full flex-col no-scrollbar', className)}>
          {/* Forces remounting the editable area as soon as Yjs syncs — the
              editor.tf.init() called internally by yjs.init() doesn't always
              propagate the new editor.children to this tree on its own. */}
          <EditorContainer
            key={isSynced ? 'synced' : 'pending'}
            className='min-h-0 flex-1 no-scrollbar'
          >
            <Editor placeholder='Digite algo...' />
            <CursorOverlay />
          </EditorContainer>
        </div>
      </Plate>
    </WikiEditorProvider>
  )
}
