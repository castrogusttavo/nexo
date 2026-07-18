import type {
  MemberAccountStatus,
  MemberAuthMethod,
  MemberDTO,
} from '@/types/member'
import type { MembershipWithUser } from '../repositories/membership.repository'

const AUTH_METHOD_BY_PROVIDER: Record<string, MemberAuthMethod> = {
  credential: 'EMAIL_PASSWORD',
  google: 'GOOGLE',
  github: 'GITHUB',
}

function accountStatusOf(
  user: MembershipWithUser['user'],
): MemberAccountStatus {
  if (user.deletionScheduledAt) return 'PENDING_DELETION'
  if (!user.emailVerified) return 'UNVERIFIED'
  return 'ACTIVE'
}

function authMethodsOf(
  accounts: MembershipWithUser['user']['accounts'],
): MemberAuthMethod[] {
  const methods = accounts
    .map((account) => AUTH_METHOD_BY_PROVIDER[account.providerId])
    .filter((method): method is MemberAuthMethod => Boolean(method))
  return Array.from(new Set(methods))
}

export function toMemberDTO(membership: MembershipWithUser): MemberDTO {
  return {
    membershipId: membership.id,
    userId: membership.userId,
    name: membership.user.name,
    username: membership.user.username,
    email: membership.user.email,
    image: membership.user.image,
    role: membership.role,
    accountStatus: accountStatusOf(membership.user),
    authMethods: authMethodsOf(membership.user.accounts),
    twoFactorEnabled: membership.user.twoFactorEnabled,
    joinedAt: membership.createdAt.toISOString(),
  }
}
