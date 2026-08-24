import type { Issue, IssuePriority, Prisma } from '@prisma/client'
import { issueNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { getPrismaReplica } from '../lib/prisma-replica'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

const issueWithGroupsInclude = {
  labels: { select: { labelId: true } },
  assignees: { select: { userId: true } },
} satisfies Prisma.IssueInclude

export type IssueWithGroups = Prisma.IssueGetPayload<{
  include: typeof issueWithGroupsInclude
}>

export const IssueRepository = {
  async findById(id: string): Promise<Result<Issue>> {
    try {
      const issue = await prisma.issue.findUnique({ where: { id } })
      if (!issue || issue.deletedAt) return err(issueNotFound())
      return ok(issue)
    } catch (error) {
      return err(dbError('Failed to find issue by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<IssueWithGroups[]>> {
    try {
      const issues = await getPrismaReplica().issue.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { number: 'asc' },
        include: issueWithGroupsInclude,
      })
      return ok(issues)
    } catch (error) {
      return err(dbError('Failed to list issues', error))
    }
  },

  async listChildren(parentId: string): Promise<Result<Issue[]>> {
    try {
      const children = await prisma.issue.findMany({
        where: { parentId, deletedAt: null },
        orderBy: { number: 'asc' },
      })
      return ok(children)
    } catch (error) {
      return err(dbError('Failed to list issue children', error))
    }
  },

  async findByProjectAndNumber(
    projectId: string,
    number: number,
  ): Promise<Result<Issue>> {
    try {
      const issue = await prisma.issue.findFirst({
        where: { projectId, number, deletedAt: null },
      })

      if (!issue) return err(issueNotFound())
      return ok(issue)
    } catch (error) {
      return err(dbError('Failed to find issue by project and number', error))
    }
  },

  async listByProjectPage(
    projectId: string,
    { cursor, take }: { cursor?: number; take: number },
  ): Promise<Result<{ items: IssueWithGroups[]; hasNextPage: boolean }>> {
    try {
      const issues = await getPrismaReplica().issue.findMany({
        where: {
          projectId,
          deletedAt: null,
          ...(cursor !== undefined && { number: { gt: cursor } }),
        },
        orderBy: { number: 'asc' },
        take: take + 1,
        include: issueWithGroupsInclude,
      })

      const hasNextPage = issues.length > take
      const items = hasNextPage ? issues.slice(0, take) : issues

      return ok({ items, hasNextPage })
    } catch (error) {
      return err(dbError('Failed to list issues page', error))
    }
  },

  async countByProject(projectId: string): Promise<Result<number>> {
    try {
      const count = await getPrismaReplica().issue.count({
        where: { projectId, deletedAt: null },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count issues', error))
    }
  },

  async create(data: {
    title: string
    description: Prisma.InputJsonValue
    priority?: IssuePriority
    startDate?: Date
    dueDate?: Date
    stateId: string
    typeId: string
    cycleId?: string
    moduleId?: string
    estimateValueId?: string
    authorId: string
    projectId: string
    parentId?: string
  }): Promise<Result<Issue>> {
    try {
      const issue = await prisma.$transaction(async (tx) => {
        const project = await tx.project.update({
          where: { id: data.projectId },
          data: { issueSequence: { increment: 1 } },
        })
        return tx.issue.create({
          data: { ...data, number: project.issueSequence },
        })
      })
      return ok(issue)
    } catch (error) {
      return err(dbError('Failed to create issue', error))
    }
  },

  async update(
    id: string,
    data: {
      title?: string
      description?: Prisma.InputJsonValue
      priority?: IssuePriority
      startDate?: Date | null
      dueDate?: Date | null
      stateId?: string
      typeId?: string
      cycleId?: string | null
      moduleId?: string | null
      estimateValueId?: string | null
      parentId?: string | null
    },
  ): Promise<Result<Issue>> {
    try {
      const updated = await prisma.issue.update({ where: { id }, data })
      return ok(updated)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueNotFound())
      }
      return err(dbError('Failed to update issue', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.issue.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueNotFound())
      }
      return err(dbError('Failed to delete issue', error))
    }
  },
}
