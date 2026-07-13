import type { Role } from '@prisma/client'
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { MembershipRepository } from '@/src/repositories/membership.repository'

export const PRIVILEGED_ROLES = ['OWNER', 'ADMIN'] as const

export function isPrivilegedRole(role: Role): boolean {
  return (PRIVILEGED_ROLES as readonly string[]).includes(role)
}

export interface MembershipContext {
  role: Role
  isPrivileged: boolean
}

export async function assertMember(
  actorId: string,
  workspaceId: string,
): Promise<Result<MembershipContext>> {
  const membership = await MembershipRepository.findByUserAndWorkspace(
    actorId,
    workspaceId,
  )
  if (!membership.ok) return membership
  if (!membership.value) return err(forbidden())

  return ok({
    role: membership.value.role,
    isPrivileged: isPrivilegedRole(membership.value.role),
  })
}

export async function assertPrivileged(
  actorId: string,
  workspaceId: string,
): Promise<Result<MembershipContext>> {
  const membership = await assertMember(actorId, workspaceId)
  if (!membership.ok) return membership
  if (!membership.value.isPrivileged) return err(forbidden())
  return ok(membership.value)
}
