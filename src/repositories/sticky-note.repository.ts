import type { Prisma, StickyColor, StickyNote } from '@prisma/client'
import { notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

const DEFAULT_CONTENT: Prisma.InputJsonValue = { type: 'doc', content: [] }

export const StickyNoteRepository = {
  async findById(id: string): Promise<Result<StickyNote>> {
    try {
      const stickyNote = await prisma.stickyNote.findUnique({ where: { id } })

      if (!stickyNote) return err(notFound('StickyNote'))

      return ok(stickyNote)
    } catch (error) {
      return err(dbError('Failed to find sticky note by id', error))
    }
  },

  async listByUserId(userId: string): Promise<Result<StickyNote[]>> {
    try {
      const stickyNotes = await prisma.stickyNote.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      })

      return ok(stickyNotes)
    } catch (error) {
      return err(dbError('Failed to list sticky notes', error))
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
    } catch (error) {
      return err(dbError('Failed to create sticky note', error))
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
    } catch (error) {
      return err(dbError('Failed to update sticky note', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.stickyNote.delete({ where: { id } })

      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete sticky note', error))
    }
  },
}
