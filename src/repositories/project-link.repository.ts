import type { ProjectLink } from '@prisma/client'
import { projectLinkNotFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import { dbError } from './db-error'

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2025'
}

export const ProjectLinkRepository = {
  async findById(id: string): Promise<Result<ProjectLink>> {
    try {
      const link = await prisma.projectLink.findUnique({ where: { id } })
      if (!link) return err(projectLinkNotFound())
      return ok(link)
    } catch (error) {
      return err(dbError('Failed to find project link', error))
    }
  },

  async listByProject(projectId: string): Promise<Result<ProjectLink[]>> {
    try {
      return ok(
        await prisma.projectLink.findMany({
          where: { projectId },
          orderBy: { createdAt: 'asc' },
        }),
      )
    } catch (error) {
      return err(dbError('Failed to list project links', error))
    }
  },

  async countByProject(projectId: string): Promise<Result<number>> {
    try {
      return ok(await prisma.projectLink.count({ where: { projectId } }))
    } catch (error) {
      return err(dbError('Failed to count project links', error))
    }
  },

  async create(data: {
    projectId: string
    url: string
    title: string | null
    createdById: string
  }): Promise<Result<ProjectLink>> {
    try {
      return ok(await prisma.projectLink.create({ data }))
    } catch (error) {
      return err(dbError('Failed to create project link', error))
    }
  },

  async update(
    id: string,
    data: { url?: string; title?: string | null },
  ): Promise<Result<ProjectLink>> {
    try {
      return ok(await prisma.projectLink.update({ where: { id }, data }))
    } catch (error) {
      if (isNotFound(error)) return err(projectLinkNotFound())
      return err(dbError('Failed to update project link', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.projectLink.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      if (isNotFound(error)) return err(projectLinkNotFound())
      return err(dbError('Failed to delete project link', error))
    }
  },
}
