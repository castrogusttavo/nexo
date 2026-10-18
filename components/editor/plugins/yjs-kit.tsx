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
        onError: ({ type, error }) => {
          console.error('[yjs] error', type, error)
        },
        onSyncChange: ({ isSynced }) => {
          if (isSynced) onSyncChange?.(isSynced)
        }
      }
    })
  ]
}
