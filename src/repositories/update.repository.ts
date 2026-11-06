import type { Update, User } from '@prisma/client'
import { updateNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type UpdateAuthor = Pick<User, 'id' | 'name' | 'username' | 'image'>

export type UpdateWithDetails = Update & {
  author: UpdateAuthor | null
  /** Rows in the order they were made; the mapper folds them into counts. */
  reactions: { emoji: string; userId: string }[]
  _count: { replies: number }
}

const withDetails = {
  author: {
    select: { id: true, name: true, username: true, image: true },
  },
  reactions: {
    select: { emoji: true, userId: true },
    orderBy: { createdAt: 'asc' },
  },
  _count: { select: { replies: true } },
} as const

const isNotFound = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'P2025'

export const UpdateRepository = {
  async findById(id: string): Promise<Result<Update>> {
    try {
      const update = await prisma.update.findUnique({ where: { id } })
      if (!update) return err(updateNotFound())
      return ok(update)
    } catch (error) {
      return err(dbError('Failed to find update by id', error))
    }
  },

  // Newest first; the id breaks a tie on createdAt so a page boundary never
  // loses or repeats a row. One extra row tells whether another page follows.
  async listByProject(
    projectId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<
    Result<{ updates: UpdateWithDetails[]; nextCursor: string | null }>
  > {
    try {
      const rows = await prisma.update.findMany({
        where: { projectId },
        include: withDetails,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      })
      const hasMore = rows.length > limit
      const updates = hasMore ? rows.slice(0, limit) : rows
      return ok({
        updates,
        nextCursor: hasMore ? (updates.at(-1)?.id ?? null) : null,
      })
    } catch (error) {
      return err(dbError('Failed to list project updates', error))
    }
  },

  async createForProject(data: {
    projectId: string
    authorId: string
    status: Update['status']
    content?: string
  }): Promise<Result<UpdateWithDetails>> {
    try {
      const update = await prisma.update.create({
        data,
        include: withDetails,
      })
      return ok(update)
    } catch (error) {
      return err(dbError('Failed to create project update', error))
    }
  },

  async update(
    id: string,
    data: { status: Update['status']; content?: string },
  ): Promise<Result<UpdateWithDetails>> {
    try {
      const update = await prisma.update.update({
        where: { id },
        data: { ...data, editedAt: new Date() },
        include: withDetails,
      })
      return ok(update)
    } catch (error) {
      if (isNotFound(error)) return err(updateNotFound())
      return err(dbError('Failed to update the update', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.update.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (isNotFound(error)) return err(updateNotFound())
      return err(dbError('Failed to delete the update', error))
    }
  },
}
