import { createId } from '@paralleldrive/cuid2'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { NEXT_PUBLIC_URL } from '@/lib/env/env'
import type { InvitationDTO } from '@/types/invitation'
import {
  forbidden,
  invitationAlreadyMember,
  invitationDuplicate,
  invitationEmailMismatch,
  invitationExpired,
  invitationNotFound,
  invitationNotPending,
} from '../errors'
import { sendInviteUserToWorkspaceEmail } from '../lib/mail/workspace/send-invite-user-to-workspace'
import { err, ok, type Result } from '../lib/result'
import { toInvitationDTO } from '../mappers/invitation.mapper'
import { InvitationRepository } from '../repositories/invitation.repository'
import { MembershipRepository } from '../repositories/membership.repository'
import { UserRepository } from '../repositories/user.repository'
import { WorkspaceRepository } from '../repositories/workspace.repository'
import type { CreateInvitationDTO } from '../schemas/invitation.schema'

const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'] as const
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

function expiresAt(): Date {
  return new Date(Date.now() + INVITATION_TTL_MS)
}

function isExpired(date: Date): boolean {
  return date.getTime() < Date.now()
}

async function assertPrivileged(
  actorId: string,
  workspaceId: string,
): Promise<Result<true>> {
  const membership = await MembershipRepository.findByUserAndWorkspace(
    actorId,
    workspaceId,
  )
  if (!membership.ok) return membership
  if (!membership.value) return err(forbidden())
  if (!PRIVILEGED_ROLES.includes(membership.value.role as never)) {
    return err(forbidden())
  }
  return ok(true)
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

    const pending = await InvitationRepository.findPendingByWorkspaceAndEmail(
      workspaceId,
      email,
    )
    if (!pending.ok) return pending
    if (pending.value) {
      if (isExpired(pending.value.expiresAt)) {
        await InvitationRepository.updateStatus(pending.value.id, 'EXPIRED')
      } else {
        return err(invitationDuplicate())
      }
    }

    const created = await InvitationRepository.create({
      email,
      role: dto.role,
      expiresAt: expiresAt(),
      invitedById: actorId,
      workspaceId,
      projectId: dto.projectId ?? null,
    })
    if (!created.ok) return created

    await this.dispatchEmail(actorId, workspaceId, created.value.token, email)

    auditMutation({
      entity: 'invitation',
      action: 'create',
      actorId,
      targetId: created.value.id,
      meta: { workspaceId, email, role: dto.role },
    })

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

    const invitation = await InvitationRepository.findById(invitationId)
    if (!invitation.ok) return invitation
    if (!invitation.value || invitation.value.workspaceId !== workspaceId) {
      return err(invitationNotFound())
    }
    if (invitation.value.status !== 'PENDING') {
      return err(invitationNotPending())
    }

    const updated = await InvitationRepository.updateStatus(
      invitationId,
      'REVOKED',
    )
    if (!updated.ok) return updated

    auditMutation({
      entity: 'invitation',
      action: 'revoke',
      actorId,
      targetId: invitationId,
      meta: { workspaceId },
    })

    return ok(toInvitationDTO(updated.value))
  },

  async resend(
    actorId: string,
    workspaceId: string,
    invitationId: string,
  ): Promise<Result<InvitationDTO>> {
    const privileged = await assertPrivileged(actorId, workspaceId)
    if (!privileged.ok) return privileged

    const invitation = await InvitationRepository.findById(invitationId)
    if (!invitation.ok) return invitation
    if (!invitation.value || invitation.value.workspaceId !== workspaceId) {
      return err(invitationNotFound())
    }
    if (
      invitation.value.status === 'ACCEPTED' ||
      invitation.value.status === 'REVOKED'
    ) {
      return err(invitationNotPending())
    }

    const refreshed = await InvitationRepository.refreshToken(
      invitationId,
      createId(),
      expiresAt(),
    )
    if (!refreshed.ok) return refreshed

    await this.dispatchEmail(
      actorId,
      workspaceId,
      refreshed.value.token,
      refreshed.value.email,
    )

    auditMutation({
      entity: 'invitation',
      action: 'update',
      actorId,
      targetId: invitationId,
      reason: 'resend',
      meta: { workspaceId },
    })

    return ok(toInvitationDTO(refreshed.value))
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

    const accepted = await InvitationRepository.accept({
      invitationId: invite.id,
      userId: actorId,
      workspaceId: invite.workspaceId,
      role: invite.role,
      projectId: invite.projectId,
    })
    if (!accepted.ok) return accepted

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

  async dispatchEmail(
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
  },
}
