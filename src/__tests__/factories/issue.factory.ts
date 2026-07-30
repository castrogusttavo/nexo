import { createId } from '@paralleldrive/cuid2'
import type {
  Issue,
  IssueAssignee,
  IssuePriority,
  IssueSubscriber,
  Prisma,
} from '@prisma/client'
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

export function createFakeIssueAssignee(
  overrides?: Partial<IssueAssignee>,
): IssueAssignee {
  const now = new Date()
  return {
    id: createId(),
    issueId: createId(),
    userId: createId(),
    createdAt: now,
    ...overrides,
  }
}

export function seedIssueAssignee(issueId: string, userId: string) {
  return prisma.issueAssignee.create({ data: { issueId, userId } })
}

export function createFakeIssueSubscriber(
  overrides?: Partial<IssueSubscriber>,
): IssueSubscriber {
  const now = new Date()
  return {
    id: createId(),
    issueId: createId(),
    userId: createId(),
    createdAt: now,
    ...overrides,
  }
}

export function seedIssueSubscriber(issueId: string, userId: string) {
  return prisma.issueSubscriber.create({ data: { issueId, userId } })
}
