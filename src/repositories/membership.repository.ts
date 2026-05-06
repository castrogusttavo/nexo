import type { Membership, Role, Workspace } from '@prisma/client'
import { databaseError } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export type MembershipWithWorkspace = Membership & { workspace: Workspace }

export const MembershipRepository = {
  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<Membership | null>> {
    try {
      const membership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      })
      return ok(membership)
    } catch {
      return err(databaseError('Failed to find membership'))
    }
  },

  async findByUserAndSlug(
    userId: string,
    slug: string,
  ): Promise<Result<MembershipWithWorkspace | null>> {
    try {
      const membership = await prisma.membership.findFirst({
        where: { userId, workspace: { slug } },
        include: { workspace: true },
      })
      return ok(membership)
    } catch {
      return err(databaseError('Failed to find membership by slug'))
    }
  },

  async listByUser(
    userId: string,
  ): Promise<Result<MembershipWithWorkspace[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: { userId },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      })
      return ok(memberships)
    } catch {
      return err(databaseError('Failed to list memberships'))
    }
  },

  async create(data: {
    userId: string
    workspaceId: string
    role?: Role
  }): Promise<Result<Membership>> {
    try {
      const membership = await prisma.membership.create({ data })
      return ok(membership)
    } catch {
      return err(databaseError('Failed to create membership'))
    }
  },
}
