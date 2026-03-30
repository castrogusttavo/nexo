'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface CollaborativeTextOptions {
  docName: string
  wsUrl?: string
  userName?: string
}

interface ConnectedUser {
  id: number
  name: string
  color: string
}

const RANDOM_COLORS = [
  '#e06c75',
  '#98c379',
  '#e5c07b',
  '#61afef',
  '#c678dd',
  '#56b6c2',
  '#d19a66',
]

// biome-ignore lint/suspicious/noExplicitAny: dynamic import types
type YText = any
// biome-ignore lint/suspicious/noExplicitAny: dynamic import types
type YDoc = any

export function useCollaborativeText({
  docName,
  wsUrl = 'ws://localhost:4444',
  userName,
}: CollaborativeTextOptions) {
  const [text, setText] = useState('')
  const [users, setUsers] = useState<ConnectedUser[]>([])
  const [connected, setConnected] = useState(false)

  const ytextRef = useRef<YText>(null)
  const docRef = useRef<YDoc>(null)
  const suppressRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let provider: { disconnect: () => void; awareness: any } | undefined
    let doc: { destroy: () => void } | undefined
    let ytext: YText | undefined
    let observer: (() => void) | undefined
    let awarenessHandler: (() => void) | undefined

    async function init() {
      const Y = await import('yjs')
      const { WebsocketProvider } = await import('y-websocket')

      if (cancelled) return

      const ydoc = new Y.Doc()
      const wp = new WebsocketProvider(wsUrl, docName, ydoc)
      const yt = ydoc.getText('content')

      doc = ydoc
      provider = wp
      ytext = yt
      docRef.current = ydoc
      ytextRef.current = yt

      // Sync Y.Text → React state
      observer = () => {
        suppressRef.current = true
        setText(yt.toString())
        suppressRef.current = false
      }
      yt.observe(observer)

      // Connection status
      wp.on('status', ({ status }: { status: string }) => {
        if (!cancelled) setConnected(status === 'connected')
      })

      // Awareness — usuários conectados
      const awareness = wp.awareness
      const color = RANDOM_COLORS[ydoc.clientID % RANDOM_COLORS.length]
      awareness.setLocalStateField('user', {
        name: userName ?? `User-${ydoc.clientID}`,
        color,
      })

      awarenessHandler = () => {
        if (cancelled) return
        const connectedUsers: ConnectedUser[] = []
        for (const [id, state] of awareness.getStates()) {
          if (state.user) {
            connectedUsers.push({
              id,
              name: state.user.name,
              color: state.user.color,
            })
          }
        }
        setUsers(connectedUsers)
      }
      awareness.on('change', awarenessHandler)
      awarenessHandler()

      setText(yt.toString())
    }

    init()

    return () => {
      cancelled = true
      if (ytext && observer) ytext.unobserve(observer)
      if (provider?.awareness && awarenessHandler) {
        provider.awareness.off('change', awarenessHandler)
      }
      provider?.disconnect()
      doc?.destroy()
    }
  }, [docName, wsUrl, userName])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (suppressRef.current) return

      const ytext = ytextRef.current
      const doc = docRef.current
      if (!ytext || !doc) return

      const newValue = e.target.value
      const oldValue = ytext.toString()

      // Diff por prefixo/sufixo comum
      let start = 0
      while (
        start < oldValue.length &&
        start < newValue.length &&
        oldValue[start] === newValue[start]
      ) {
        start++
      }

      let oldEnd = oldValue.length
      let newEnd = newValue.length
      while (
        oldEnd > start &&
        newEnd > start &&
        oldValue[oldEnd - 1] === newValue[newEnd - 1]
      ) {
        oldEnd--
        newEnd--
      }

      doc.transact(() => {
        if (oldEnd - start > 0) ytext.delete(start, oldEnd - start)
        if (newEnd - start > 0)
          ytext.insert(start, newValue.slice(start, newEnd))
      })
    },
    [],
  )

  return { text, handleChange, users, connected }
}
