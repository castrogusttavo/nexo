import type { Prisma, User, WikiComment } from '@prisma/client'
import { wikiCommentNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type WikiCommentWithAuthor = WikiComment & {
  author: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const authorSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const WikiCommentRepository = {
  async findById(id: string): Promise<Result<WikiComment>> {
    try {
      const comment = await prisma.wikiComment.findUnique({ where: { id } })
      if (!comment) return err(wikiCommentNotFound())
      return ok(comment)
    } catch (error) {
      return err(dbError('Failed to find wiki comment by id', error))
    }
  },

  async listByWikiPage(
    wikiPageId: string,
  ): Promise<Result<WikiCommentWithAuthor[]>> {
    try {
      const comments = await prisma.wikiComment.findMany({
        where: { wikiPageId },
        include: { author: authorSelect },
        orderBy: [{ markId: 'asc' }, { createdAt: 'asc' }],
      })
      return ok(comments)
    } catch (error) {
      return err(dbError('Failed to list wiki comments', error))
    }
  },

  async create(data: {
    wikiPageId: string
    authorId: string
    markId: string
    content: Prisma.InputJsonValue
    parentId?: string
  }): Promise<Result<WikiCommentWithAuthor>> {
    try {
      const comment = await prisma.wikiComment.create({
        data,
        include: { author: authorSelect },
      })
      return ok(comment)
    } catch (error) {
      return err(dbError('Failed to create wiki comment', error))
    }
  },

  async update(
    id: string,
    content: Prisma.InputJsonValue,
  ): Promise<Result<WikiCommentWithAuthor>> {
    try {
      const comment = await prisma.wikiComment.update({
        where: { id },
        data: { content },
        include: { author: authorSelect },
      })
      return ok(comment)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(wikiCommentNotFound())
      }
      return err(dbError('Failed to update wiki comment', error))
    }
  },

  async resolve(
    id: string,
    data: { resolved: boolean; resolvedById: string | null },
  ): Promise<Result<WikiCommentWithAuthor>> {
    try {
      const comment = await prisma.wikiComment.update({
        where: { id },
        data: {
          resolved: data.resolved,
          resolvedById: data.resolved ? data.resolvedById : null,
          resolvedAt: data.resolved ? new Date() : null,
        },
        include: { author: authorSelect },
      })
      return ok(comment)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(wikiCommentNotFound())
      }
      return err(dbError('Failed to resolve wiki comment', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.wikiComment.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(wikiCommentNotFound())
      }
      return err(dbError('Failed to delete wiki comment', error))
    }
  },
}
