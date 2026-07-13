import type { WorkspaceInvitation } from '@prisma/client'
import type { InvitationDTO } from '@/types/invitation'
import { withTimestamps } from './_shared'

export function toInvitationDTO(
  invitation: WorkspaceInvitation,
): InvitationDTO {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt.toISOString(),
    workspaceId: invitation.workspaceId,
    projectId: invitation.projectId,
    invitedById: invitation.invitedById,
    ...withTimestamps(invitation),
  }
}
