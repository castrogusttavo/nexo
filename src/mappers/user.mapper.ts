import type { UserWithMemberships } from '@/src/repositories/user.repository'
import type { UserDTO } from '@/types/user'

export function toUserDTO(user: UserWithMemberships): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image,
    createdAt: user.createdAt.toISOString(),
    deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
    acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: user.acceptedPrivacyAt?.toISOString() ?? null,
    memberships: user.memberships.map((m) => ({
      workspaceId: m.workspaceId,
      slug: m.workspace.slug,
      name: m.workspace.name,
      role: m.role,
    })),
  }
}
