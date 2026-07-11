import type {
  InviteStatus,
  Membership,
  Role,
  Workspace,
  WorkspaceInvitation,
} from '@prisma/client'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import { dbError } from './db-error'

export type InvitationWithWorkspace = WorkspaceInvitation & {
  workspace: Workspace
}

export const InvitationRepository = {
  async create(data: {
    email: string
    role: Role
    expiresAt: Date
    invitedById: string
    workspaceId: string
    projectId?: string | null
  }): Promise<Result<WorkspaceInvitation>> {
    try {
      const invitation = await prisma.workspaceInvitation.create({ data })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to create invitation', error))
    }
  },

  async findByToken(
    token: string,
  ): Promise<Result<InvitationWithWorkspace | null>> {
    try {
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: { workspace: true },
      })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to find invitation by token', error))
    }
  },

  async findById(id: string): Promise<Result<WorkspaceInvitation | null>> {
    try {
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { id },
      })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to find invitation', error))
    }
  },

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<Result<WorkspaceInvitation | null>> {
    try {
      const invitation = await prisma.workspaceInvitation.findFirst({
        where: { workspaceId, email, status: 'PENDING' },
      })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to find pending invitation', error))
    }
  },

  async listByWorkspace(
    workspaceId: string,
  ): Promise<Result<WorkspaceInvitation[]>> {
    try {
      const invitations = await prisma.workspaceInvitation.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      })
      return ok(invitations)
    } catch (error) {
      return err(dbError('Failed to list invitations', error))
    }
  },

  async countPendingByWorkspace(workspaceId: string): Promise<Result<number>> {
    try {
      const count = await prisma.workspaceInvitation.count({
        where: {
          workspaceId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      })
      return ok(count)
    } catch (error) {
      return err(dbError('Failed to count pending invitations', error))
    }
  },

  async listByProject(
    projectId: string,
  ): Promise<Result<WorkspaceInvitation[]>> {
    try {
      const invitations = await prisma.workspaceInvitation.findMany({
        where: { projectId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      })
      return ok(invitations)
    } catch (error) {
      return err(dbError('Failed to list project invitations', error))
    }
  },

  async updateStatus(
    id: string,
    status: InviteStatus,
  ): Promise<Result<WorkspaceInvitation>> {
    try {
      const invitation = await prisma.workspaceInvitation.update({
        where: { id },
        data: { status },
      })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to update invitation status', error))
    }
  },

  async refreshToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<Result<WorkspaceInvitation>> {
    try {
      const invitation = await prisma.workspaceInvitation.update({
        where: { id },
        data: { token, status: 'PENDING', expiresAt },
      })
      return ok(invitation)
    } catch (error) {
      return err(dbError('Failed to refresh invitation', error))
    }
  },

  async accept(params: {
    invitationId: string
    userId: string
    workspaceId: string
    role: Role
    projectId?: string | null
  }): Promise<Result<Membership>> {
    try {
      const membership = await prisma.$transaction(async (tx) => {
        const m = await tx.membership.upsert({
          where: {
            userId_workspaceId: {
              userId: params.userId,
              workspaceId: params.workspaceId,
            },
          },
          update: {},
          create: {
            userId: params.userId,
            workspaceId: params.workspaceId,
            role: params.role,
          },
        })

        if (params.projectId) {
          await tx.projectMember.upsert({
            where: {
              userId_projectId: {
                userId: params.userId,
                projectId: params.projectId,
              },
            },
            update: {},
            create: {
              userId: params.userId,
              projectId: params.projectId,
            },
          })
        }

        await tx.workspaceInvitation.update({
          where: { id: params.invitationId },
          data: { status: 'ACCEPTED' },
        })

        await tx.user.update({
          where: { id: params.userId },
          data: { onboardingStep: null },
        })

        return m
      })

      return ok(membership)
    } catch (error) {
      return err(dbError('Failed to accept invitation', error))
    }
  },
}
