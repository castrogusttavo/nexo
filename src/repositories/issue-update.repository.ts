import type { IssueUpdate, User } from '@prisma/client'
import { issueUpdateNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type IssueUpdateWithAuthor = IssueUpdate & {
  author: Pick<User, 'id' | 'name' | 'username' | 'image'>
}

const authorSelect = {
  select: { id: true, name: true, username: true, image: true },
} as const

export const IssueUpdateRepository = {
  async findById(id: string): Promise<Result<IssueUpdate>> {
    try {
      const update = await prisma.issueUpdate.findUnique({ where: { id } })
      if (!update) return err(issueUpdateNotFound())
      return ok(update)
    } catch (error) {
      return err(dbError('Failed to find issue update by id', error))
    }
  },

  async listByIssue(issueId: string): Promise<Result<IssueUpdateWithAuthor[]>> {
    try {
      const updates = await prisma.issueUpdate.findMany({
        where: { issueId },
        include: { author: authorSelect },
        orderBy: { createdAt: 'desc' },
      })
      return ok(updates)
    } catch (error) {
      return err(dbError('Failed to list issue updates', error))
    }
  },

  async create(data: {
    status: IssueUpdate['status']
    content?: string
    issueId: string
    authorId: string
  }): Promise<Result<IssueUpdateWithAuthor>> {
    try {
      const update = await prisma.issueUpdate.create({
        data,
        include: { author: authorSelect },
      })
      return ok(update)
    } catch (error) {
      return err(dbError('Failed to create issue update', error))
    }
  },

  async update(
    id: string,
    data: { status: IssueUpdate['status']; content?: string },
  ): Promise<Result<IssueUpdateWithAuthor>> {
    try {
      const update = await prisma.issueUpdate.update({
        where: { id },
        data: { ...data, editedAt: new Date() },
        include: { author: authorSelect },
      })
      return ok(update)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueUpdateNotFound())
      }
      return err(dbError('Failed to update issue update', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.issueUpdate.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueUpdateNotFound())
      }
      return err(dbError('Failed to delete issue update', error))
    }
  },
}
