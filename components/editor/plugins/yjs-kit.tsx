'use client'

import { NEXT_PUBLIC_REALTIME_URL } from '@/lib/env/env'
import { YjsPlugin } from '@platejs/yjs/react'

export function createYjsKit({
  documentName,
  userName,
  userColor,
  onSyncChange,
}: {
  documentName: string
  userName: string
  userColor: string
  onSyncChange?: (isSynced: boolean) => void
  }) {
  return [
    YjsPlugin.configure({
      options: {
        cursors: { data: { name: userName, color: userColor } },
        providers: [
          {
            type: 'hocuspocus',
            options: { name: documentName, url: NEXT_PUBLIC_REALTIME_URL }
          }
        ],
        onConnect: ({ type }) => {
          console.log('[yjs] connected', type)
        },
        onDisconnect: ({ type }) => {
          console.log('[yjs] disconnected', type)
        },
        onError: ({ type, error }) => {
          console.error('[yjs] error', type, error)
        },
        onSyncChange: ({ type, isSynced }) => {
          console.log('[yjs] sync change', type, isSynced)
          if (isSynced) onSyncChange?.(isSynced)
        }
      }
    })
  ]
}
