import type { ProjectLabel } from '@prisma/client'
import { projectLabelAlreadyExists, projectLabelNotFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002'
}

export const ProjectLabelRepository = {
  async findById(id: string): Promise<Result<ProjectLabel>> {
    try {
      const label = await prisma.projectLabel.findUnique({ where: { id } })
      if (!label) return err(projectLabelNotFound())
      return ok(label)
    } catch (error) {
      return err(dbError('Failed to find project label by id', error))
    }
  },

  async listByWorkspace(workspaceId: string): Promise<Result<ProjectLabel[]>> {
    try {
      const labels = await prisma.projectLabel.findMany({
        where: { workspaceId },
        orderBy: { name: 'asc' },
      })
      return ok(labels)
    } catch (error) {
      return err(dbError('Failed to list project labels', error))
    }
  },

  // How many of these ids are labels of the workspace: the service compares
  // it with the number of distinct ids, so one missing or foreign id shows.
  async countInWorkspace(
    workspaceId: string,
    ids: string[],
  ): Promise<Result<number>> {
    try {
      if (ids.length === 0) return ok(0)
      const count = await prisma.projectLabel.count({
        where: { workspaceId, id: { in: ids } },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count project labels', error))
    }
  },

  async create(data: {
    workspaceId: string
    name: string
    description?: string
    color?: ProjectLabel['color']
  }): Promise<Result<ProjectLabel>> {
    try {
      const label = await prisma.projectLabel.create({ data })
      return ok(label)
    } catch (error) {
      if (isUniqueViolation(error)) return err(projectLabelAlreadyExists())
      return err(dbError('Failed to create project label', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      color?: ProjectLabel['color']
    },
  ): Promise<Result<ProjectLabel>> {
    try {
      const label = await prisma.projectLabel.update({ where: { id }, data })
      return ok(label)
    } catch (error) {
      if (isUniqueViolation(error)) return err(projectLabelAlreadyExists())
      return err(dbError('Failed to update project label', error))
    }
  },

  // The assignments cascade: deleting a label takes it off every project.
  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.projectLabel.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete project label', error))
    }
  },
}
