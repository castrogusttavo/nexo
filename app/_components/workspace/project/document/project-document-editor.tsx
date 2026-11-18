'use client'

import type { Value } from 'platejs'
import { useEffect, useRef } from 'react'
import { CollabTextEditor } from '@/components/editor/collab-text-editor'
import {
  useProjectDocument,
  useSaveProjectDocument,
} from '@/src/hooks/use-project-document'

// The live content is already synced over Yjs/Hocuspocus; this autosave only
// keeps the flat JSON snapshot current, so a longer debounce cannot lose
// keystrokes.
const AUTOSAVE_DELAY_MS = 1500

interface ProjectDocumentEditorProps {
  workspaceId: string
  projectId: string
  projectSlug: string
  userId: string
  userName: string
  /** Lead or ADMIN/OWNER; everyone else sees the document live, read-only. */
  canManage: boolean
}

export function ProjectDocumentEditor({
  workspaceId,
  projectId,
  projectSlug,
  userId,
  userName,
  canManage,
}: ProjectDocumentEditorProps) {
  const { data: snapshot } = useProjectDocument(workspaceId, projectSlug)
  const save = useSaveProjectDocument(workspaceId, projectSlug)
  const contentRef = useRef<Value | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (!snapshot) return null

  function scheduleSave(content: Value) {
    if (!canManage) return
    contentRef.current = content
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (contentRef.current) save.mutate(contentRef.current)
    }, AUTOSAVE_DELAY_MS)
  }

  return (
    <CollabTextEditor
      key={projectId}
      documentName={`project:${projectId}`}
      workspaceId={workspaceId}
      userId={userId}
      userName={userName}
      content={
        snapshot.content.length > 0
          ? (snapshot.content as Value)
          : [{ type: 'p', children: [{ text: '' }] }]
      }
      onChange={scheduleSave}
      readOnly={!canManage}
      placeholder='Escreva a descrição, o contexto e os objetivos do projeto...'
      variant='flush'
      className='min-h-60'
    />
  )
}
