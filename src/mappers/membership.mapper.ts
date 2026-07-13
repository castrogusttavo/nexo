import type { Role } from '@prisma/client'
import type { MembershipWithWorkspace } from '@/src/repositories/membership.repository'
import type { WorkspaceDTO } from '@/types/workspace'
import { toWorkspaceDTO } from './workspace.mapper'

export interface MembershipDTO {
  id: string
  userId: string
  workspaceId: string
  role: Role
  workspace: WorkspaceDTO
  createdAt: string
  updatedAt: string
}

export function toMembershipDTO(
  membership: MembershipWithWorkspace,
): MembershipDTO {
  return {
    id: membership.id,
    userId: membership.userId,
    workspaceId: membership.workspaceId,
    role: membership.role,
    workspace: toWorkspaceDTO(membership.workspace),
    createdAt: membership.createdAt.toISOString(),
    updatedAt: membership.updatedAt.toISOString(),
  }
}
