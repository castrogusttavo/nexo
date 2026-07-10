import type { Plan, Workspace } from '@prisma/client'
import { conflict, databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export const WorkspaceRepository = {
  async findById(id: string): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id } })

      if (!workspace) {
        return err(notFound('Workspace'))
      }

      return ok(workspace)
    } catch {
      return err(databaseError('Failed to find workspace by id'))
    }
  },

  async findBySlug(slug: string): Promise<Result<Workspace | null>> {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { slug } })
      return ok(workspace)
    } catch {
      return err(databaseError('Failed to find workspace by slug'))
    }
  },

  async create(data: {
    name: string
    slug: string
  }): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.workspace.create({ data })
      return ok(workspace)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Slug já está em uso'))
      }
      return err(databaseError('Failed to create workspace'))
    }
  },

  async createWithOwner(
    data: {
      name: string
      slug: string
      activePlan?: Plan
      trialEndsAt?: Date | null
    },
    userId: string,
  ): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.$transaction(async (tx) => {
        const ws = await tx.workspace.create({ data })
        await tx.membership.create({
          data: { userId, workspaceId: ws.id, role: 'OWNER' },
        })
        return ws
      })
      return ok(workspace)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Slug já está em uso'))
      }
      return err(databaseError('Failed to create workspace'))
    }
  },

  async update(
    id: string,
    data: { name?: string; slug?: string },
  ): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.workspace.update({ where: { id }, data })
      return ok(workspace)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Slug já está em uso'))
      }
      return err(databaseError('Failed to update workspace'))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.workspace.delete({ where: { id } })
      return ok(undefined)
    } catch {
      return err(databaseError('Failed to delete workspace'))
    }
  },
}
