import { createId } from '@paralleldrive/cuid2'
import type { Account } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { createFakeMembership } from '@/src/__tests__/factories/membership.factory'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { toMemberDTO } from '../member.mapper'

function fakeAccount(providerId: string): Account {
  const now = new Date()
  return {
    id: createId(),
    accountId: createId(),
    providerId,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    scope: null,
    password: null,
    createdAt: now,
    updatedAt: now,
    userId: createId(),
  }
}

function withUser(overrides: {
  user?: Parameters<typeof createFakeUser>[0]
  accounts?: string[]
}) {
  const membership = createFakeMembership({ role: 'ADMIN' })
  const user = createFakeUser(overrides.user)
  return {
    ...membership,
    user: { ...user, accounts: (overrides.accounts ?? []).map(fakeAccount) },
  }
}

describe('toMemberDTO', () => {
  it('maps ACTIVE when email is verified and no deletion is scheduled', () => {
    const dto = toMemberDTO(withUser({ user: { emailVerified: true } }))
    expect(dto.accountStatus).toBe('ACTIVE')
  })

  it('maps UNVERIFIED when email is not verified', () => {
    const dto = toMemberDTO(withUser({ user: { emailVerified: false } }))
    expect(dto.accountStatus).toBe('UNVERIFIED')
  })

  it('amps PENDING_DELETION over UNVERIFIED when both apply', () => {
    const dto = toMemberDTO(
      withUser({
        user: { emailVerified: false, deletionScheduledAt: new Date() },
      }),
    )
    expect(dto.accountStatus).toBe('PENDING_DELETION')
  })

  it('derives auth methods from linked accounts, deduped', () => {
    const dto = toMemberDTO(
      withUser({
        accounts: ['credential', 'google', 'github', 'unknown-provider'],
      }),
    )
    expect(dto.authMethods).toEqual(['EMAIL_PASSWORD', 'GOOGLE', 'GITHUB'])
  })

  it('carries membershipId, role and joinedAt from the membershpip row', () => {
    const membership = createFakeMembership({ role: 'VIEWER' })
    const user = createFakeUser()
    const dto = toMemberDTO({ ...membership, user: { ...user, accounts: [] } })

    expect(dto.membershipId).toBe(membership.id)
    expect(dto.role).toBe('VIEWER')
    expect(dto.joinedAt).toBe(membership.createdAt.toISOString())
  })
})
