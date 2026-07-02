import { createId } from '@paralleldrive/cuid2'
import type { InviteStatus, Role, WorkspaceInvitation } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export function createFakeInvitation(
  overrides?: Partial<WorkspaceInvitation>,
): WorkspaceInvitation {
  const now = new Date()
  return {
    id: createId(),
    email: `invitee-${createId().slice(0, 6)}@example.com`,
    role: 'MEMBER' as Role,
    token: createId(),
    status: 'PENDING' as InviteStatus,
    expiresAt: new Date(now.getTime() + SEVEN_DAYS_MS),
    invitedById: createId(),
    workspaceId: createId(),
    projectId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedInvitation(
  data: Pick<WorkspaceInvitation, 'invitedById' | 'workspaceId'> &
    Partial<
      Pick<
        WorkspaceInvitation,
        'email' | 'role' | 'status' | 'expiresAt' | 'projectId'
      >
    >,
) {
  return prisma.workspaceInvitation.create({
    data: {
      email: `invitee-${createId().slice(0, 6)}@example.com`,
      expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      ...data,
    },
  })
}
