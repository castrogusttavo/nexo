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
  const [isSynced, setIsSynced] = useState(false)

  const editor = usePlateEditor({
    plugins: [
      ...BasicNodesKit,
      ...ListKit,
      ...CodeBlockKit,
      ...ColumnKit,
      ...ToggleKit,
      ...AlignKit,
      ...FontKit,
      ...LineHeightKit,
      ...CursorOverlayKit,
      ...BlockMenuKit,
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

    // Abrir o WebSocket enquanto a página ainda está carregando (fontes,
    // HMR, scripts de analytics disputando conexão) faz o browser derrubar
    // a conexão ("interrupted while the page was loading"). Espera o
    // carregamento terminar de verdade antes de conectar.
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
    <Plate
      editor={editor}
      onChange={({ value }) => {
        // Ctrl+A -> Del pode zerar editor.children antes da normalização
        // do Slate rodar (a inicialização via Yjs desliga a normalização
        // padrão, ver yjs.init()). Um documento vazio quebra a renderização
        // — nunca deixa isso se propagar pro autosave nem pro resto da árvore.
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
        {/* Força remontar a área editável assim que o Yjs sincroniza — o
            editor.tf.init() chamado internamente pelo yjs.init() nem sempre
            propaga o novo editor.children pra essa árvore sozinho. */}
        <EditorContainer
          key={isSynced ? 'synced' : 'pending'}
          className='min-h-0 flex-1 no-scrollbar'
        >
          <Editor placeholder='Digite algo...' />
          <CursorOverlay />
        </EditorContainer>
      </div>
    </Plate>
  )
}
