import type { Prisma, StickyColor, StickyNote } from '@prisma/client'
import { databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

const DEFAULT_CONTENT: Prisma.InputJsonValue = { type: 'doc', content: [] }

export const StickyNoteRepository = {
  async findById(id: string): Promise<Result<StickyNote>> {
    try {
      const stickyNote = await prisma.stickyNote.findUnique({ where: { id } })

      if (!stickyNote) return err(notFound('StickyNote'))

      return ok(stickyNote)
    } catch {
      return err(databaseError('Failed to find sticky note by id'))
    }
  },

  async listByUserId(userId: string): Promise<Result<StickyNote[]>> {
    try {
      const stickyNotes = await prisma.stickyNote.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })

      return ok(stickyNotes)
    } catch {
      return err(databaseError('Failed to list sticky notes'))
    }
  },

  async create(data: {
    userId: string
    content?: Prisma.InputJsonValue
    color?: StickyColor
  }): Promise<Result<StickyNote>> {
    try {
      const stickyNote = await prisma.stickyNote.create({
        data: {
          userId: data.userId,
          content: data.content ?? DEFAULT_CONTENT,
          color: data.color ?? 'ZINC',
        },
      })

      return ok(stickyNote)
    } catch {
      return err(databaseError('Failed to create sticky note'))
    }
  },

  async update(
    id: string,
    data: {
      content?: Prisma.InputJsonValue
      color?: StickyColor
    },
  ): Promise<Result<StickyNote>> {
    try {
      const stickyNote = await prisma.stickyNote.update({
        where: { id },
        data,
      })

      return ok(stickyNote)
    } catch {
      return err(databaseError('Failed to update sticky note'))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.stickyNote.delete({ where: { id } })

      return ok(undefined)
    } catch {
      return err(databaseError('Failed to delete sticky note'))
    }
  },
}
