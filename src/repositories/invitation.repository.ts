import type {
  InviteStatus,
  Membership,
  Role,
  Workspace,
  WorkspaceInvitation,
} from '@prisma/client'
import { databaseError } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'

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
    } catch {
      return err(databaseError('Failed to create invitation'))
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
    } catch {
      return err(databaseError('Failed to find invitation by token'))
    }
  },

  async findById(id: string): Promise<Result<WorkspaceInvitation | null>> {
    try {
      const invitation = await prisma.workspaceInvitation.findUnique({
        where: { id },
      })
      return ok(invitation)
    } catch {
      return err(databaseError('Failed to find invitation'))
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
    } catch {
      return err(databaseError('Failed to find pending invitation'))
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
    } catch {
      return err(databaseError('Failed to list invitations'))
    }
  },

  async countPendingByWorkspace(workspaceId: string): Promise<Result<number>> {
    try {
      const count = await prisma.workspaceInvitation.count({
        where: { workspaceId, status: 'PENDING' },
      })
      return ok(count)
    } catch {
      return err(databaseError('Failed to count pending invitations'))
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
    } catch {
      return err(databaseError('Failed to list project invitations'))
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
    } catch {
      return err(databaseError('Failed to update invitation status'))
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
    } catch {
      return err(databaseError('Failed to refresh invitation'))
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

        return m
      })

      return ok(membership)
    } catch {
      return err(databaseError('Failed to accept invitation'))
    }
  },
}
