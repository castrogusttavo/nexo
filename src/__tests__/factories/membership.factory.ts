import { createId } from '@paralleldrive/cuid2'
import type { Membership, Role } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeMembership(
  overrides?: Partial<Membership>,
): Membership {
  const now = new Date()
  return {
    id: createId(),
    userId: createId(),
    workspaceId: createId(),
    role: 'MEMBER' as Role,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedMembership(data: {
  userId: string
  workspaceId: string
  role?: Role
}) {
  return prisma.membership.create({
    data: { role: 'MEMBER', ...data },
  })
}
