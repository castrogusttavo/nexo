import { createId } from '@paralleldrive/cuid2'
import type { Prisma, StickyColor, StickyNote } from '@prisma/client'
import type { JSONContent } from '@tiptap/react'
import { prisma } from '@/src/lib/prisma'
import type { StickyNoteDTO } from '@/types/sticky-note'

export function createFakeStickyNote(
  overrides?: Partial<StickyNote>,
): StickyNote {
  const now = new Date()
  const content: Prisma.JsonValue = { type: 'doc', content: [] }
  return {
    id: createId(),
    content,
    color: 'ZINC',
    userId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeStickyNoteDTO(
  overrides: Partial<StickyNoteDTO>,
): StickyNoteDTO {
  const now = new Date().toISOString()
  const content: JSONContent = { type: 'doc', content: [] }
  return {
    id: createId(),
    content,
    color: 'ZINC',
    userId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedStickyNote(
  userId: string,
  overrides?: { content?: Prisma.InputJsonValue; color?: StickyColor },
) {
  const content: Prisma.InputJsonValue = { type: 'doc', content: [] }
  return prisma.stickyNote.create({
    data: {
      userId,
      content,
      color: 'ZINC',
      ...overrides,
    },
  })
}
