import { createId } from '@paralleldrive/cuid2'
import type { User } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { UserDTO } from '@/types/user'

export function createFakeUser(overrides?: Partial<User>): User {
  const now = new Date()
  return {
    id: createId(),
    name: 'Test User',
    email: `test-${createId()}@example.com`,
    emailVerified: false,
    image: null,
    role: 'MEMBER',
    workspaceId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeUserDTO(overrides?: Partial<UserDTO>): UserDTO {
  return {
    id: createId(),
    name: 'Test User',
    email: `test-${createId()}@example.com`,
    emailVerified: false,
    image: null,
    role: 'MEMBER',
    workspaceId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

export async function seedUser(
  overrides?: Partial<Pick<User, 'name' | 'email' | 'role' | 'workspaceId'>>,
) {
  return prisma.user.create({
    data: {
      name: 'Seed User',
      email: `seed-${createId()}@example.com`,
      ...overrides,
    },
  })
}
