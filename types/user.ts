export interface MembershipDTO {
  workspaceId: string
  slug: string
  name: string
  role: string
}

export type UserRole =
  | 'PRODUCT_MANAGER'
  | 'ENGINEERING_MANAGER'
  | 'DESIGNER'
  | 'DEVELOPER'
  | 'FOUNDER_EXECUTIVE'
  | 'OPERATIONS_MANAGER'
  | 'OTHER'

export type UserGoal =
  | 'ROADMAP'
  | 'SPRINTS'
  | 'CROSS_FUNCTIONAL'
  | 'REPLACE_TOOL'
  | 'EXPLORING'

export interface UserDTO {
  id: string
  name: string
  email: string
  username: string
  emailVerified: boolean
  image: string | null
  coverImage: string | null
  createdAt: string
  deletionScheduledAt: string | null
  acceptedTermsAt: string | null
  acceptedPrivacyAt: string | null
  onboardingStep: 'PROFILE' | 'ROLE' | 'BRINGS' | 'WORKSPACE' | null
  role: UserRole | null
  goals: UserGoal[]
  memberships: MembershipDTO[]
}
