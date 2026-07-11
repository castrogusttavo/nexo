import type { Plan, Workspace } from '@prisma/client'
import { conflict, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

export const WorkspaceRepository = {
  async findById(id: string): Promise<Result<Workspace>> {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { id } })

      if (!workspace) {
        return err(notFound('Workspace'))
      }

      return ok(workspace)
    } catch (error) {
      return err(dbError('Failed to find workspace by id', error))
    }
  },

  async findBySlug(slug: string): Promise<Result<Workspace | null>> {
    try {
      const workspace = await prisma.workspace.findUnique({ where: { slug } })
      return ok(workspace)
    } catch (error) {
      return err(dbError('Failed to find workspace by slug', error))
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
      return err(dbError('Failed to create workspace', error))
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

        await tx.user.update({
          where: { id: userId },
          data: { onboardingStep: null },
        })
        return ws
      })
      return ok(workspace)
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return err(conflict('Slug já está em uso'))
      }
      return err(dbError('Failed to create workspace', error))
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
      return err(dbError('Failed to update workspace', error))
    }
  },

  async revertExpiredTrials(now: Date = new Date()): Promise<Result<number>> {
    try {
      const { count } = await prisma.workspace.updateMany({
        where: {
          trialEndsAt: { lt: now },
          activePlan: { not: 'FREE' },
          subscriptions: { none: { status: 'PAID' } },
        },
        data: { activePlan: 'FREE' },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to revert expired trials', error))
    }
  },

  async delete(id: string): Promise<Result<void>> {
    try {
      await prisma.workspace.delete({ where: { id } })
      return ok(undefined)
    } catch (error) {
      return err(dbError('Failed to delete workspace', error))
    }
  },
}
