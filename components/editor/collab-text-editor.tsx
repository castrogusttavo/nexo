'use client'

import { useMounted } from '@/components/hooks/use-mounted';
import { cn } from '@/lib/utils';
import { WikiEditorProvider } from '@/src/hooks/use-wiki-editor-context';
import { YjsPlugin } from '@platejs/yjs/react';
import { KEYS, type Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import { useEffect, useState } from 'react';
import { CursorOverlayKit } from './plugins/cursor-overlay-kit';
import { createYjsKit } from './plugins/yjs-kit';
import { TEXT_EDITOR_PLUGINS } from './text-editor';
import { CursorOverlay } from './ui/cursor-overlay';
import { Editor, EditorContainer, EditorProps } from './ui/editor';

// Deterministic color per user: the same userId always gets the same cursor.
function colorFromUserId(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 50%)`
}

interface CollabTextEditorProps {
  /** Hocuspocus document name, e.g. `project:{id}`. */
  documentName: string
  workspaceId: string
  userId: string
  userName: string
  /** Seeds an empty Yjs document; the synced state wins once it exists. */
  content: Value
  onChange?: (content: Value) => void
  placeholder?: string
  /** The server also refuses writes from a read-only connection. */
  readOnly?: boolean
  className?: string
  variant: EditorProps['variant']
}

// The text editor with live collaboration (Yjs over Hocuspocus, cursors) and
// no comment threads. The wiki editor is the same idea with discussions.
export function CollabTextEditor({
  documentName,
  workspaceId,
  userId,
  userName,
  content,
  onChange,
  placeholder,
  readOnly,
  className,
  variant
}: CollabTextEditorProps) {
  const [isSynced, setIsSynced] = useState(false)
  const mounted = useMounted()

  const editor = usePlateEditor({
    plugins: [
      ...TEXT_EDITOR_PLUGINS,
      ...CursorOverlayKit,
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

  useEffect(() => {
    if (!mounted) return

    let cancelled = false

    // Opening the WebSocket while the page is still loading makes the browser
    // drop the connection, so it waits for the load to finish.
    function start() {
      if (cancelled) return
      editor.getApi(YjsPlugin).yjs.init({ id: documentName, value: content })
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
    // `content` only seeds the first sync; later values must not re-init.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, documentName, mounted])

  return (
    <WikiEditorProvider
      workspaceId={workspaceId}
      // Only the comment and discussion hooks read this, and neither is here.
      wikiPageId=''
      userId={userId}
      userName={userName}
    >
      <Plate
        editor={editor}
        readOnly={readOnly}
        onChange={({ value }) => {
          // Ctrl+A then Del can empty editor.children before normalization
          // runs (Yjs init disables it); an empty document breaks rendering.
          if (value.length === 0) {
            editor.tf.insertNodes(editor.api.create.block({ type: KEYS.p }), {
              at: [0],
            })
            return
          }
          onChange?.(value)
        }}
      >
        <div className={cn('flex h-full flex-col no-scrollbar', className)}>
          {/* Remounts the editable area once Yjs syncs: init() replaces
              editor.children without always propagating it to this tree. */}
          <EditorContainer
            key={isSynced ? 'synced' : 'pending'}
            data-sync-state={isSynced ? 'synced' : 'pending'}
            className='min-h-0 flex-1 no-scrollbar p-0!'
          >
            <Editor placeholder={placeholder} variant={variant} />
            <CursorOverlay />
          </EditorContainer>
        </div>
      </Plate>
    </WikiEditorProvider>
  )
}
