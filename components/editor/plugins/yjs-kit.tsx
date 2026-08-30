'use client'

import { NEXT_PUBLIC_REALTIME_URL } from '@/lib/env/env'
import { YjsPlugin } from '@platejs/yjs/react'

export function createYjsKit({
  documentName,
  userName,
  userColor,
}: {
  documentName: string
  userName: string
  userColor: string
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
        ]
      }
    })
  ]
}
