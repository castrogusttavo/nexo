import type { Account, Membership, Role, User, Workspace } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

export type MembershipWithWorkspace = Membership & { workspace: Workspace }
export type MembershipWithUser = Membership & {
  user: User & { accounts: Account[] }
}

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
    } catch (error) {
      return err(dbError('Failed to find membership', error))
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
    } catch (error) {
      return err(dbError('Failed to find membership by slug', error))
    }
  },

  async listByUser(userId: string): Promise<Result<MembershipWithWorkspace[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: { userId },
        include: { workspace: true },
        orderBy: { createdAt: 'asc' },
      })
      return ok(memberships)
    } catch (error) {
      return err(dbError('Failed to list memberships', error))
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
    } catch (error) {
      return err(dbError('Failed to create membership', error))
    }
  },

  async countByWorkspace(workspaceId: string): Promise<Result<number>> {
    try {
      const count = await prisma.membership.count({
        where: { workspaceId },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Faield to count memberships', error))
    }
  },

  async listUserIdsByWorkspace(workspaceId: string): Promise<Result<string[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: { workspaceId },
        select: { userId: true },
      })
      return ok(memberships.map((m) => m.userId))
    } catch (error) {
      return err(dbError('Failed to list membership user ids', error))
    }
  },

  async listByWorkspaceWithUser(
    workspaceId: string,
    filters: { search?: string; roles?: Role[] },
  ): Promise<Result<MembershipWithUser[]>> {
    try {
      const memberships = await prisma.membership.findMany({
        where: {
          workspaceId,
          ...(filters.roles?.length ? { role: { in: filters.roles } } : {}),
          ...(filters.search
            ? {
                user: {
                  OR: [
                    { name: { contains: filters.search, mode: 'insensitive' } },
                    {
                      username: {
                        contains: filters.search,
                        mode: 'insensitive',
                      },
                    },
                    {
                      email: { contains: filters.search, mode: 'insensitive' },
                    },
                  ],
                },
              }
            : {}),
        },
        include: { user: { include: { accounts: true } } },
      })
      return ok(memberships)
    } catch (error) {
      return err(dbError('Failed to list workspace members with user', error))
    }
  },
}
