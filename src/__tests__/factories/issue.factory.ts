import { createId } from '@paralleldrive/cuid2'
import type { Issue, IssuePriority, Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeIssue(overrides?: Partial<Issue>): Issue {
  const now = new Date()
  return {
    id: createId(),
    number: 1,
    title: 'Fix login bug',
    description: { type: 'doc', content: [] },
    priority: 'NONE',
    stateId: createId(),
    typeId: createId(),
    assigneeId: null,
    authorId: createId(),
    projectId: createId(),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedIssue(
  data: {
    stateId: string
    typeId: string
    authorId: string
    projectId: string
  },
  overrides?: {
    title?: string
    description?: Prisma.InputJsonValue
    priority?: IssuePriority
    assigneeId?: string
    number?: number
  },
) {
  return prisma.issue.create({
    data: {
      title: 'Fix login bug',
      description: { type: 'doc', content: [] },
      number: 1,
      ...data,
      ...overrides,
    },
  })
}
