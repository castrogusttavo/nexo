import type { UpdateReply } from '@prisma/client'
import { updateReplyNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'
import type { UpdateAuthor } from './update.repository'

export type UpdateRpelyWithAuthor = UpdateReply & {
  author: UpdateAuthor | null
}

const authorSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

const isNotFound = (error: unknown) =>
  error instanceof Error && 'code' in error && error.code === 'P2025'

export const UpdateReplyRepository = {
  async findById(id: string): Promise<Result<UpdateReply>> {
    try {
      const reply = await prisma.updateReply.findUnique({ where: { id } })
      if (!reply) return err(updateReplyNotFound())
      return ok(reply)
    } catch (error) {
      return err(dbError('Failed to find update reply by id', error))
    }
  },

  async listByUpdate(
    updateId: string,
  ): Promise<Result<UpdateRpelyWithAuthor[]>> {
    try {
      const replies = await prisma.updateReply.findMany({
        where: { updateId },
        include: { author: authorSelect },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      })
      return ok(replies)
    } catch (error) {
      return err(dbError('Failed to list update replies', error))
    }
  },

  async create(data: {
    updateId: string
    authorId: string
    content: string
  }): Promise<Result<UpdateRpelyWithAuthor>> {
    try {
      const reply = await prisma.updateReply.create({
        data,
        include: { author: authorSelect },
      })
      return ok(reply)
    } catch (error) {
      return err(dbError('Failed to create update reply', error))
    }
  },

  async update(
    id: string,
    data: { content: string },
  ): Promise<Result<UpdateRpelyWithAuthor>> {
    try {
      const reply = await prisma.updateReply.update({
        where: { id },
        data: { ...data, editedAt: new Date() },
        include: { author: authorSelect },
      })
      return ok(reply)
    } catch (error) {
      if (isNotFound(error)) return err(updateReplyNotFound())
      return err(dbError('Failed to update the reply', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.updateReply.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (isNotFound(error)) return err(updateReplyNotFound())
      return err(dbError('Failed to update the reply', error))
    }
  },
}
