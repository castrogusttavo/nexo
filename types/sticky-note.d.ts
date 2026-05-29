import type { JSONContent } from '@tiptap/react'

export type StickyColorDTO =
  | 'RED'
  | 'YELLOW'
  | 'BLUE'
  | 'GREEN'
  | 'PURPLE'
  | 'ZINC'

export interface StickyNoteDTO {
  id: string
  content: JSONContent
  color: StickyColorDTO
  userId: string
  createdAt: string
  updatedAt: string
}
