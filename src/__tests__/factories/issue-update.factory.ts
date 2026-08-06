import { createId } from '@paralleldrive/cuid2'
import type { IssueUpdate } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeIssueUpdate(
  overrides?: Partial<IssueUpdate>,
): IssueUpdate {
  const now = new Date()
  return {
    id: createId(),
    status: 'ON_TRACK',
    content: 'Tudo indo bem',
    issueId: createId(),
    authorId: createId(),
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedIssueUpdate(
  issueId: string,
  authorId: string,
  overrides?: {
    status?: IssueUpdate['status']
    content?: string | null
    editedAt?: Date
  },
) {
  return prisma.issueUpdate.create({
    data: {
      status: 'ON_TRACK',
      content: 'Tudo indo bem',
      issueId,
      authorId,
      ...overrides,
    },
  })
}
