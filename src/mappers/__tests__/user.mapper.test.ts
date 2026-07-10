import { describe, expect, it } from 'vitest'
import { createFakeUser } from '@/src/__tests__/factories/user.factory'
import { toUserDTO } from '@/src/mappers/user.mapper'
import type { UserWithMemberships } from '@/src/repositories/user.repository'

function withMemberships(
  user: ReturnType<typeof createFakeUser>,
  memberships: UserWithMemberships['memberships'] = [],
): UserWithMemberships {
  return { ...user, memberships }
}

describe('toUserDTO()', () => {
  it('should map all fields correctly', () => {
    const user = withMemberships(
      createFakeUser({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        username: 'johndoe',
        emailVerified: true,
        image: 'https://example.com/avatar.png',
        coverImage: null,
      }),
      [
        {
          id: 'mem-1',
          userId: 'user-1',
          workspaceId: 'ws-1',
          role: 'ADMIN',
          createdAt: new Date(),
          updatedAt: new Date(),
          workspace: {
            id: 'ws-1',
            name: 'Acme',
            slug: 'acme',
            activePlan: 'FREE',
            trialEndsAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    )

    const dto = toUserDTO(user)

    expect(dto).toEqual({
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      username: 'johndoe',
      emailVerified: true,
      image: 'https://example.com/avatar.png',
      coverImage: null,
      createdAt: user.createdAt.toISOString(),
      deletionScheduledAt: null,
      acceptedTermsAt: null,
      acceptedPrivacyAt: null,
      goals: [],
      onboardingStep: null,
      role: null,
      memberships: [
        {
          workspaceId: 'ws-1',
          slug: 'acme',
          name: 'Acme',
          role: 'ADMIN',
        },
      ],
    })
  })

  it('maps acceptedTermsAt and acceptedPrivacyAt to ISO strings when set', () => {
    const termsAt = new Date('2026-05-18T12:00:00.000Z')
    const privacyAt = new Date('2026-05-18T12:00:00.000Z')
    const user = withMemberships(
      createFakeUser({
        acceptedTermsAt: termsAt,
        acceptedPrivacyAt: privacyAt,
      }),
    )

    const dto = toUserDTO(user)

    expect(dto.acceptedTermsAt).toBe('2026-05-18T12:00:00.000Z')
    expect(dto.acceptedPrivacyAt).toBe('2026-05-18T12:00:00.000Z')
  })

  it('should map deletionScheduledAt to ISO string when set', () => {
    const at = new Date('2026-06-01T00:00:00.000Z')
    const user = withMemberships(createFakeUser({ deletionScheduledAt: at }))

    const dto = toUserDTO(user)

    expect(dto.deletionScheduledAt).toBe('2026-06-01T00:00:00.000Z')
  })

  it('should convert createdAt Date to ISO string', () => {
    const date = new Date('2025-01-15T10:30:00.000Z')
    const user = withMemberships(createFakeUser({ createdAt: date }))

    const dto = toUserDTO(user)

    expect(dto.createdAt).toBe('2025-01-15T10:30:00.000Z')
  })

  it('should handle null image', () => {
    const user = withMemberships(createFakeUser({ image: null }))

    const dto = toUserDTO(user)

    expect(dto.image).toBeNull()
  })

  it('should default to empty memberships', () => {
    const user = withMemberships(createFakeUser())

    const dto = toUserDTO(user)

    expect(dto.memberships).toEqual([])
  })

  it('should exclude updatedAt from the output', () => {
    const user = withMemberships(createFakeUser())

    const dto = toUserDTO(user)

    expect(dto).not.toHaveProperty('updatedAt')
  })

  it('should exclude password-related fields', () => {
    const user = withMemberships(createFakeUser())

    const dto = toUserDTO(user)

    expect(dto).not.toHaveProperty('password')
  })
})
