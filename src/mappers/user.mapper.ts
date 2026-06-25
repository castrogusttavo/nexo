import type { UserWithMemberships } from '@/src/repositories/user.repository'
import type { UserDTO, UserGoal } from '@/types/user'

export function toUserDTO(user: UserWithMemberships): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    emailVerified: user.emailVerified,
    image: user.image,
    coverImage: user.coverImage,
    createdAt: user.createdAt.toISOString(),
    deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
    acceptedTermsAt: user.acceptedTermsAt?.toISOString() ?? null,
    acceptedPrivacyAt: user.acceptedPrivacyAt?.toISOString() ?? null,
    onboardingStep: user.onboardingStep,
    role: user.role ?? null,
    goals: user.goals as UserGoal[],
    memberships: user.memberships.map((m) => ({
      workspaceId: m.workspaceId,
      slug: m.workspace.slug,
      name: m.workspace.name,
      role: m.role,
    })),
  }
}
