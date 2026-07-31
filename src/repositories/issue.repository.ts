import type { Issue, IssuePriority, Prisma } from '@prisma/client'
import { issueNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

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

  async listByProject(projectId: string): Promise<Result<Issue[]>> {
    try {
      const issues = await prisma.issue.findMany({
        where: { projectId, deletedAt: null },
        orderBy: { number: 'asc' },
      })
      return ok(issues)
    } catch (error) {
      return err(dbError('Failed to list issues', error))
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
    authorId: string
    projectId: string
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
