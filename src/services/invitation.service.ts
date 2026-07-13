import { createId } from '@paralleldrive/cuid2'
import type { WorkspaceInvitation } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import type { InvitationDTO, InviteToProjectResult } from '@/types/invitation'
import { UserCache } from '../cache/user.cache'
import {
  invitationAlreadyMember,
  invitationDuplicate,
  invitationEmailMismatch,
  invitationExpired,
  invitationNotFound,
  invitationNotPending,
  projectForbidden,
  seatLimitReached,
} from '../errors'
import { sendInviteUserToWorkspaceEmail } from '../lib/mail/workspace/send-invite-user-to-workspace'
import { limitOf } from '../lib/plans'
import { err, ok, type Result } from '../lib/result'
import { toInvitationDTO } from '../mappers/invitation.mapper'
import { toProjectMemberDTO } from '../mappers/project.mapper'
import { InvitationRepository } from '../repositories/invitation.repository'
import { MembershipRepository } from '../repositories/membership.repository'
import { ProjectRepository } from '../repositories/project.repository'
import { UserRepository } from '../repositories/user.repository'
import { WorkspaceRepository } from '../repositories/workspace.repository'
import type {
  CreateInvitationDTO,
  InviteToProjectDTO,
} from '../schemas/invitation.schema'
import { assertMember, assertPrivileged } from './_authz'

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function expiresAt(): Date {
  return new Date(Date.now() + INVITATION_TTL_MS)
}

function isExpired(date: Date): boolean {
  return date.getTime() < Date.now()
}

async function assertSeatAvailable(
  workspaceId: string,
  options: { includePending: boolean },
): Promise<Result<number | null>> {
  const workspace = await WorkspaceRepository.findById(workspaceId)
  if (!workspace.ok) return workspace

  const seats = limitOf(workspace.value.activePlan, 'seats')
  if (seats === null) return ok(null) // unlimited plan

  const members = await MembershipRepository.countByWorkspace(workspaceId)
  if (!members.ok) return members

  let used = members.value
  if (options.includePending) {
    const pending =
      await InvitationRepository.countPendingByWorkspace(workspaceId)
    if (!pending.ok) return pending
    used += pending.value
  }

  if (used >= seats) {
    logger.warn('invitation.seat_limit_reached', {
      workspaceId,
      plan: workspace.value.activePlan,
      seats,
      used,
    })
    return err(seatLimitReached())
  }

  return ok(seats)
}

async function dispatchEmail(
  actorId: string,
  workspaceId: string,
  token: string,
  email: string,
): Promise<void> {
  try {
    const [inviter, workspace] = await Promise.all([
      UserRepository.findById(actorId),
      WorkspaceRepository.findById(workspaceId),
    ])
    if (!inviter.ok || !workspace.ok) return

    await sendInviteUserToWorkspaceEmail({
      email,
      redirectUrl: `${NEXT_PUBLIC_URL}/invite/accept?token=${token}`,
      inviterName: inviter.value.name,
      inviterEmail: inviter.value.email,
      inviterImage: inviter.value.image ?? undefined,
      workspaceName: workspace.value.name,
    })
  } catch (error) {
    logger.warn('invitation.email_failed', {
      workspaceId,
      error: error instanceof Error ? error.message : 'unknown',
    })
  }
}

async function assertProjectManager(
  actorId: string,
  workspaceId: string,
  slug: string,
): Promise<Result<{ id: string; leadId: string }>> {
  const membership = await assertMember(actorId, workspaceId)
  if (!membership.ok) return membership

  const projectResult = await ProjectRepository.findByWorkspaceAndSlug(
    workspaceId,
    slug,
    actorId,
  )
  if (!projectResult.ok) return projectResult
  const project = projectResult.value

  if (!membership.value.isPrivileged && project.leadId !== actorId) {
    return err(projectForbidden('sem permissão para gerenciar membros'))
  }

  return ok({ id: project.id, leadId: project.leadId })
}

// Shared invitation lifecycle — everything past "who's allowed to invite
// and into what scope" is identical for workspace and project invites:
// dedupe against a pending invite, re-check the seat cap, persist, email,
// audit. The two scopes only differ in the gate they pass through before
// reaching this and the projectId they invite into.
async function createPendingInvitation(params: {
  actorId: string
  workspaceId: string
  email: string
  role: CreateInvitationDTO['role']
  projectId: string | null
}): Promise<Result<WorkspaceInvitation>> {
  const pending = await InvitationRepository.findPendingByWorkspaceAndEmail(
    params.workspaceId,
    params.email,
  )
  if (!pending.ok) return pending
  if (pending.value) {
    if (isExpired(pending.value.expiresAt)) {
      await InvitationRepository.updateStatus(pending.value.id, 'EXPIRED')
    } else {
      return err(invitationDuplicate())
    }
  }

  const seat = await assertSeatAvailable(params.workspaceId, {
    includePending: true,
  })
  if (!seat.ok) return seat

  const created = await InvitationRepository.create(
    {
      email: params.email,
      role: params.role,
      expiresAt: expiresAt(),
      invitedById: params.actorId,
      workspaceId: params.workspaceId,
      projectId: params.projectId,
    },
    seat.value,
  )
  if (!created.ok) return created

  await dispatchEmail(
    params.actorId,
    params.workspaceId,
    created.value.token,
    params.email,
  )

  auditMutation({
    entity: 'invitation',
    action: 'create',
    actorId: params.actorId,
    targetId: created.value.id,
    meta: {
      workspaceId: params.workspaceId,
      email: params.email,
      role: params.role,
      ...(params.projectId ? { projectId: params.projectId } : {}),
    },
  })

  return created
}

async function revokeInvitationInScope(params: {
  actorId: string
  invitationId: string
  belongsToScope: (invitation: {
    workspaceId: string
    projectId: string | null
  }) => boolean
  auditMeta: Record<string, unknown>
}): Promise<Result<InvitationDTO>> {
  const invitation = await InvitationRepository.findById(params.invitationId)
  if (!invitation.ok) return invitation
  if (!invitation.value || !params.belongsToScope(invitation.value)) {
    return err(invitationNotFound())
  }
  if (invitation.value.status !== 'PENDING') {
    return err(invitationNotPending())
  }

  const updated = await InvitationRepository.updateStatus(
    params.invitationId,
    'REVOKED',
  )
  if (!updated.ok) return updated

  auditMutation({
    entity: 'invitation',
    action: 'revoke',
    actorId: params.actorId,
    targetId: params.invitationId,
    meta: params.auditMeta,
  })

  return ok(toInvitationDTO(updated.value))
}

async function resendInvitationInScope(params: {
  actorId: string
  workspaceId: string
  invitationId: string
  belongsToScope: (invitation: {
    workspaceId: string
    projectId: string | null
  }) => boolean
  auditMeta: Record<string, unknown>
}): Promise<Result<InvitationDTO>> {
  const invitation = await InvitationRepository.findById(params.invitationId)
  if (!invitation.ok) return invitation
  if (!invitation.value || !params.belongsToScope(invitation.value)) {
    return err(invitationNotFound())
  }
  if (
    invitation.value.status === 'ACCEPTED' ||
    invitation.value.status === 'REVOKED'
  ) {
    return err(invitationNotPending())
  }

  const refreshed = await InvitationRepository.refreshToken(
    params.invitationId,
    createId(),
    expiresAt(),
  )
  if (!refreshed.ok) return refreshed

  await dispatchEmail(
    params.actorId,
    params.workspaceId,
    refreshed.value.token,
    refreshed.value.email,
  )

  auditMutation({
    entity: 'invitation',
    action: 'update',
    actorId: params.actorId,
    targetId: params.invitationId,
    reason: 'resend',
    meta: params.auditMeta,
  })

  return ok(toInvitationDTO(refreshed.value))
}

export const InvitationService = {
  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateInvitationDTO,
  ): Promise<Result<InvitationDTO>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    const email = dto.email.trim().toLowerCase()

    const existingUser = await UserRepository.findByEmail(email)
    if (!existingUser.ok) return existingUser
    if (existingUser.value) {
      const membership = await MembershipRepository.findByUserAndWorkspace(
        existingUser.value.id,
        workspaceId,
      )
      if (!membership.ok) return membership
      if (membership.value) return err(invitationAlreadyMember())
    }

    const created = await createPendingInvitation({
      actorId,
      workspaceId,
      email,
      role: dto.role,
      projectId: dto.projectId ?? null,
    })
    if (!created.ok) return created

    return ok(toInvitationDTO(created.value))
  },

  async list(actorId: string, workspaceId: string) {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    const result = await InvitationRepository.listByWorkspace(workspaceId)
    if (!result.ok) return result

    return ok(result.value.map(toInvitationDTO))
  },

  async revoke(
    actorId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<Result<InvitationDTO>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    return revokeInvitationInScope({
      actorId,
      invitationId,
      belongsToScope: (invitation) => invitation.workspaceId === workspaceId,
      auditMeta: { workspaceId },
    })
  },

  async resend(
    actorId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<Result<InvitationDTO>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    return resendInvitationInScope({
      actorId,
      workspaceId,
      invitationId,
      belongsToScope: (invitation) => invitation.workspaceId === workspaceId,
      auditMeta: { workspaceId },
    })
  },

  async resendForProject(
    actorId: string,
    workspaceId: string,
    slug: string,
    invitationId: string,
  ): Promise<Result<InvitationDTO>> {
    const gate = await assertProjectManager(actorId, workspaceId, slug)
    if (!gate.ok) return gate

    return resendInvitationInScope({
      actorId,
      workspaceId,
      invitationId,
      belongsToScope: (invitation) => invitation.projectId === gate.value.id,
      auditMeta: { workspaceId, projectId: gate.value.id },
    })
  },

  async accept(
    actorId: string,
    actorEmail: string,
    token: string,
  ): Promise<Result<{ workspaceId: string; slug: string }>> {
    const invitation = await InvitationRepository.findByToken(token)
    if (!invitation.ok) return invitation
    if (!invitation.value) return err(invitationNotFound())

    const invite = invitation.value

    if (invite.status !== 'PENDING') {
      return invite.status === 'EXPIRED'
        ? err(invitationExpired())
        : err(invitationNotPending())
    }

    if (isExpired(invite.expiresAt)) {
      await InvitationRepository.updateStatus(invite.id, 'EXPIRED')
      return err(invitationExpired())
    }

    if (actorEmail.trim().toLowerCase() !== invite.email.toLowerCase()) {
      return err(invitationEmailMismatch())
    }

    const seat = await assertSeatAvailable(invite.workspaceId, {
      includePending: false,
    })
    if (!seat.ok) return seat

    const accepted = await InvitationRepository.accept({
      invitationId: invite.id,
      userId: actorId,
      workspaceId: invite.workspaceId,
      role: invite.role,
      projectId: invite.projectId,
      seatLimit: seat.value,
    })
    if (!accepted.ok) return accepted

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'invitation',
      action: 'accept',
      actorId,
      targetId: invite.id,
      meta: { workspaceId: invite.workspaceId },
    })

    return ok({
      workspaceId: invite.workspaceId,
      slug: invite.workspace.slug,
    })
  },

  async createForProject(
    actorId: string,
    workspaceId: string,
    slug: string,
    dto: InviteToProjectDTO,
  ): Promise<Result<InviteToProjectResult>> {
    const gate = await assertProjectManager(actorId, workspaceId, slug)
    if (!gate.ok) return gate
    const project = gate.value

    const email = dto.email.trim().toLowerCase()

    const existingUser = await UserRepository.findByEmail(email)
    if (!existingUser.ok) return existingUser

    if (existingUser.value) {
      const targetMembership =
        await MembershipRepository.findByUserAndWorkspace(
          existingUser.value.id,
          workspaceId,
        )
      if (!targetMembership.ok) return targetMembership
      if (targetMembership.value) {
        const added = await ProjectRepository.addMember(
          existingUser.value.id,
          project.id,
        )
        if (!added.ok) return added

        auditMutation({
          entity: 'project',
          action: 'update',
          actorId,
          targetId: project.id,
          reason: 'member_added_direct',
          meta: { targetUserId: existingUser.value.id },
        })

        return ok({
          kind: 'added',
          member: toProjectMemberDTO(added.value, project.leadId),
        })
      }
    }

    const created = await createPendingInvitation({
      actorId,
      workspaceId,
      email,
      role: dto.role,
      projectId: project.id,
    })
    if (!created.ok) return created

    return ok({ kind: 'invited', invitation: toInvitationDTO(created.value) })
  },

  async listForProject(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<InvitationDTO[]>> {
    const gate = await assertProjectManager(actorId, workspaceId, slug)
    if (!gate.ok) return gate

    const result = await InvitationRepository.listByProject(gate.value.id)
    if (!result.ok) return result

    return ok(result.value.map(toInvitationDTO))
  },

  async revokeForProject(
    actorId: string,
    workspaceId: string,
    slug: string,
    invitationId: string,
  ): Promise<Result<InvitationDTO>> {
    const gate = await assertProjectManager(actorId, workspaceId, slug)
    if (!gate.ok) return gate

    return revokeInvitationInScope({
      actorId,
      invitationId,
      belongsToScope: (invitation) => invitation.projectId === gate.value.id,
      auditMeta: { workspaceId, projectId: gate.value.id },
    })
  },
}
