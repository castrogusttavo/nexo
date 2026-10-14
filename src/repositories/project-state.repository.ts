import type { ProjectState } from '@prisma/client'
import {
  projectStateAlreadyExists,
  projectStateLastInGroup,
  projectStateNotFound,
} from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'P2002'
}

export const ProjectStateRepository = {
  async findById(id: string): Promise<Result<ProjectState>> {
    try {
      const state = await prisma.projectState.findUnique({ where: { id } })
      if (!state) return err(projectStateNotFound())
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to find project state by id', error))
    }
  },

  // Group order is the enum's declaration order (DRAFT -> CANCELLED); ties
  // inside a group fall back to creation, so a new state lands last.
  async listByWorkspace(workspaceId: string): Promise<Result<ProjectState[]>> {
    try {
      const states = await prisma.projectState.findMany({
        where: { workspaceId },
        orderBy: [{ group: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      })
      return ok(states)
    } catch (error) {
      return err(dbError('Failed to list project states', error))
    }
  },

  async countByGroup(
    workspaceId: string,
    group: ProjectState['group'],
  ): Promise<Result<number>> {
    try {
      const count = await prisma.projectState.count({
        where: { workspaceId, group },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count project states by group', error))
    }
  },

  async create(data: {
    workspaceId: string
    name: string
    description?: string
    group: ProjectState['group']
    color?: ProjectState['color']
  }): Promise<Result<ProjectState>> {
    try {
      const state = await prisma.projectState.create({ data })
      return ok(state)
    } catch (error) {
      if (isUniqueViolation(error)) return err(projectStateAlreadyExists())
      return err(dbError('Failed to create project state', error))
    }
  },

  async update(
    id: string,
    data: {
      name?: string
      description?: string | null
      color?: ProjectState['color']
      order?: number
    },
  ): Promise<Result<ProjectState>> {
    try {
      const state = await prisma.projectState.update({ where: { id }, data })
      return ok(state)
    } catch (error) {
      if (isUniqueViolation(error)) return err(projectStateAlreadyExists())
      return err(dbError('Failed to update project state', error))
    }
  },

  // Both writes are scoped to the workspace, so a foreign id can only fail
  // the second one (rolling the first back), never flip another workspace.
  async setDefault(
    id: string,
    workspaceId: string,
  ): Promise<Result<ProjectState>> {
    try {
      const [, state] = await prisma.$transaction([
        prisma.projectState.updateMany({
          where: { workspaceId, isDefault: true },
          data: { isDefault: false },
        }),
        prisma.projectState.update({
          where: { id, workspaceId },
          data: { isDefault: true },
        }),
      ])
      return ok(state)
    } catch (error) {
      return err(dbError('Failed to set default project state', error))
    }
  },

  // The service already refuses the last state of a group; the check is
  // repeated inside the transaction so a concurrent delete cannot leave the
  // projects with nowhere to go (the FK would then fail the delete anyway).
  async deleteMovingProjects(
    id: string,
  ): Promise<Result<{ movedTo: string; count: number }>> {
    try {
      return await prisma.$transaction(async (tx) => {
        const state = await tx.projectState.findUnique({ where: { id } })
        if (!state) return err(projectStateNotFound())

        const target = await tx.projectState.findFirst({
          where: {
            workspaceId: state.workspaceId,
            group: state.group,
            id: { not: id },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          select: { id: true },
        })
        if (!target) return err(projectStateLastInGroup())

        const { count } = await tx.project.updateMany({
          where: { stateId: id },
          data: { stateId: target.id },
        })
        await tx.projectState.delete({ where: { id } })

        return ok({ movedTo: target.id, count })
      })
    } catch (error) {
      return err(dbError('Failed to delete project state', error))
    }
  },
}
