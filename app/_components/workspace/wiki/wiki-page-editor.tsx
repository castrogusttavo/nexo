'use client'

import type { Value } from 'platejs'
import { useEffect, useRef, useState } from 'react'
import { WikiPageRichEditor } from '@/components/editor/wiki-editor'
import { Input } from '@/components/ui/input'
import { useUpdateWikiPage } from '@/src/hooks/use-wiki-page'
import type { WikiPageDTO } from '@/types/wiki-page'

// The real content is already synced in real time via Yjs/Hocuspocus —
// this autosave only keeps WikiPage.content (the flat JSON snapshot, used
// for listing/search outside the Yjs doc) up to date. Since nothing depends
// on it to avoid losing keystrokes, a larger debounce here only reduces
// write frequency with no real risk of data loss.
const AUTOSAVE_DELAY_MS = 1500 // ms

interface WikiPageEditorProps {
  workspaceId: string
  userId: string
  userName: string
  page: WikiPageDTO
}

export function WikiPageEditor({
  workspaceId,
  userId,
  userName,
  page,
}: WikiPageEditorProps) {
  const updateWikiPage = useUpdateWikiPage(workspaceId, page.id)
  const [title, setTitle] = useState(page.title)
  const contentRef = useRef<Value>(page.content)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setTitle(page.title)
    contentRef.current = page.content
  }, [page.id, page.title, page.content])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  function scheduleContentSave(content: Value) {
    contentRef.current = content
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      updateWikiPage.mutate({ content: contentRef.current })
    }, AUTOSAVE_DELAY_MS)
  }

  return (
    <div className='flex h-full flex-col gap-4 p-6 no-scrollbar'>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title !== page.title) updateWikiPage.mutate({ title })
        }}
        placeholder='Sem título'
        className='border-none px-0 text-2xl font-semibold shadow-none focus-visible:ring-0'
      />
      <WikiPageRichEditor
        key={page.id}
        documentName={page.id}
        workspaceId={workspaceId}
        userId={userId}
        userName={userName}
        content={page.content}
        onChange={scheduleContentSave}
        className='min-h-0 flex-1 no-scrollbar'
      />
    </div>
  )
}
