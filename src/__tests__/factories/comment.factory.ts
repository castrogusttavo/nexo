import { createId } from '@paralleldrive/cuid2'
import type { Comment, Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeComment(overrides?: Partial<Comment>): Comment {
  const now = new Date()
  return {
    id: createId(),
    content: { type: 'doc', content: [] },
    issueId: createId(),
    authorId: createId(),
    parentId: null,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedComment(
  issueId: string,
  authorId: string,
  overrides?: {
    content?: Prisma.InputJsonValue
    parentId?: string
    editedAt?: Date
  },
) {
  return prisma.comment.create({
    data: {
      content: { type: 'doc', content: [] },
      issueId,
      authorId,
      ...overrides,
    },
  })
}
