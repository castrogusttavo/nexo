import type { Comment, Prisma, User } from '@prisma/client'
import { commentNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type CommentWithAuthor = Comment & {
  author: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const authorSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const CommentRepository = {
  async findById(id: string): Promise<Result<Comment>> {
    try {
      const comment = await prisma.comment.findUnique({ where: { id } })
      if (!comment) return err(commentNotFound())
      return ok(comment)
    } catch (error) {
      return err(dbError('Failed to find comment by id', error))
    }
  },

  async listByIssue(issueId: string): Promise<Result<CommentWithAuthor[]>> {
    try {
      const comments = await prisma.comment.findMany({
        where: { issueId },
        include: { author: authorSelect },
        orderBy: { createdAt: 'asc' },
      })
      return ok(comments)
    } catch (error) {
      return err(dbError('Failed to list comments', error))
    }
  },

  async create(data: {
    content: Prisma.InputJsonValue
    issueId: string
    authorId: string
    parentId?: string
  }): Promise<Result<CommentWithAuthor>> {
    try {
      const comment = await prisma.comment.create({
        data,
        include: { author: authorSelect },
      })
      return ok(comment)
    } catch (error) {
      return err(dbError('Failed to create comment', error))
    }
  },

  async update(
    id: string,
    content: Prisma.InputJsonValue,
  ): Promise<Result<CommentWithAuthor>> {
    try {
      const comment = await prisma.comment.update({
        where: { id },
        data: { content, editedAt: new Date() },
        include: { author: authorSelect },
      })
      return ok(comment)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(commentNotFound())
      }
      return err(dbError('Failed to update comment', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.comment.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(commentNotFound())
      }
      return err(dbError('Failed to delete comment', error))
    }
  },
}
