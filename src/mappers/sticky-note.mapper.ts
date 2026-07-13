import type { StickyNote } from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import type { StickyNoteDTO } from '@/types/sticky-note'
import { withTimestamps } from './_shared'

export function toStickyNoteDTO(stickyNote: StickyNote): StickyNoteDTO {
  return {
    id: stickyNote.id,
    content: (stickyNote.content as JSONContent) ?? {
      type: 'doc',
      content: [],
    },
    color: stickyNote.color,
    userId: stickyNote.userId,
    ...withTimestamps(stickyNote),
  }
}
