import { createId } from '@paralleldrive/cuid2'
import type { User } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { UserDTO } from '@/types/user'

export function createFakeUser(overrides?: Partial<User>): User {
  const now = new Date()
  const id = createId()
  return {
    id,
    name: 'Test User',
    email: `test-${createId()}@example.com`,
    username: `test-${id}`.toLowerCase(),
    emailVerified: false,
    image: null,
    coverImage: null,
    twoFactorEnabled: false,
    deletionScheduledAt: null,
    acceptedTermsAt: null,
    acceptedPrivacyAt: null,
    role: null,
    goals: [],
    onboardingStep: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeUserDTO(overrides?: Partial<UserDTO>): UserDTO {
  const id = createId()

  return {
    id: createId(),
    name: 'Test User',
    email: `test-${createId()}@example.com`,
    username: `test-${id}`.toLowerCase(),
    emailVerified: false,
    image: null,
    coverImage: null,
    createdAt: new Date().toISOString(),
    deletionScheduledAt: null,
    acceptedTermsAt: null,
    acceptedPrivacyAt: null,
    role: null,
    goals: [],
    onboardingStep: null,
    memberships: [],
    ...overrides,
  }
}

export async function seedUser(
  overrides?: Partial<Pick<User, 'name' | 'email'>>,
) {
  const id = createId()

  return prisma.user.create({
    data: {
      name: 'Seed User',
      email: `seed-${createId()}@example.com`,
      username: `seed-${id}`.toLowerCase(),
      ...overrides,
    },
  })
}
