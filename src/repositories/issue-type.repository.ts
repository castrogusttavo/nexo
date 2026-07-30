import type { IssueType } from '@prisma/client'
import { issueTypeNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export const DEFAULT_ISSUE_TYPE: Array<Pick<IssueType, 'name' | 'icon'>> = [
  { name: 'Task', icon: 'task-icon' },
  { name: 'Epic', icon: 'epic-icon' },
]

export const IssueTypeRepository = {
  async findById(id: string): Promise<Result<IssueType>> {
    try {
      const type = await prisma.issueType.findUnique({ where: { id } })
      if (!type) return err(issueTypeNotFound())
      return ok(type)
    } catch (error) {
      return err(dbError('Failed to find issue type by id', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<IssueType[]>> {
    try {
      const types = await prisma.issueType.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })
      return ok(types)
    } catch (error) {
      return err(dbError('Failed to list issue types', error))
    }
  },

  async create(data: {
    name: string
    description?: string
    color?: IssueType['color']
    icon: string
    projectId: string
  }): Promise<Result<IssueType>> {
    try {
      const count = await prisma.issueType.count({
        where: { projectId: data.projectId },
      })
      const created = await prisma.issueType.create({
        data: { ...data, order: count },
      })
      return ok(created)
    } catch (error) {
      return err(dbError('Failed to create issue type', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      color?: IssueType['color']
      icon?: string
    },
  ): Promise<Result<IssueType>> {
    try {
      const updated = await prisma.issueType.update({
        where: { id },
        data,
      })
      return ok(updated)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueTypeNotFound())
      }
      return err(dbError('Failed to update issue type', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.issueType.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return err(issueTypeNotFound())
      }
      return err(dbError('Failed to delete issue type', error))
    }
  },

  async reorder(
    projectId: string,
    typeIds: string[],
  ): Promise<Result<IssueType[]>> {
    try {
      await prisma.$transaction(
        typeIds.map((id, index) =>
          prisma.issueType.update({ where: { id }, data: { order: index } }),
        ),
      )
      const types = await prisma.issueType.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      })
      return ok(types)
    } catch (error) {
      return err(dbError('Failed to reorder issue type', error))
    }
  },
}
