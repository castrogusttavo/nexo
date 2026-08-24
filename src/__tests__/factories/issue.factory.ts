import { createId } from '@paralleldrive/cuid2'
import type {
  Issue,
  IssueAssignee,
  IssueDependency,
  IssueDependencyType,
  IssueLabel,
  IssuePriority,
  IssueRelation,
  IssueRelationType,
  IssueSubscriber,
  IssueVote,
  IssueVoteType,
  Prisma,
} from '@prisma/client'
import { EMPTY_ISSUE_DESCRIPTION } from '@/lib/editor-value'
import { prisma } from '@/src/lib/prisma'

export function createFakeIssue(overrides?: Partial<Issue>): Issue {
  const now = new Date()
  return {
    id: createId(),
    number: 1,
    title: 'Fix login bug',
    description: EMPTY_ISSUE_DESCRIPTION as Prisma.JsonValue,
    priority: 'NONE',
    startDate: null,
    dueDate: null,
    stateId: createId(),
    typeId: createId(),
    cycleId: null,
    moduleId: null,
    estimateValueId: null,
    authorId: createId(),
    projectId: createId(),
    parentId: null,
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
    parentId?: string
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

export function createFakeIssueLabel(
  overrides?: Partial<IssueLabel>,
): IssueLabel {
  const now = new Date()
  return {
    id: createId(),
    issueId: createId(),
    labelId: createId(),
    createdAt: now,
    ...overrides,
  }
}

export function seedIssueLabel(issueId: string, labelId: string) {
  return prisma.issueLabel.create({ data: { issueId, labelId } })
}

export function createFakeIssueDependency(
  overrides?: Partial<IssueDependency>,
): IssueDependency {
  const now = new Date()
  return {
    id: createId(),
    sourceId: createId(),
    targetId: createId(),
    type: 'BLOCKS',
    createdAt: now,
    ...overrides,
  }
}

export function seedIssueDependency(
  sourceId: string,
  targetId: string,
  type: IssueDependencyType = 'BLOCKS',
) {
  return prisma.issueDependency.create({ data: { sourceId, targetId, type } })
}

export function createFakeIssueRelation(
  overrides?: Partial<IssueRelation>,
): IssueRelation {
  const now = new Date()
  return {
    id: createId(),
    sourceId: createId(),
    targetId: createId(),
    type: 'RELATES_TO',
    createdAt: now,
    ...overrides,
  }
}

export function seedIssueRelation(
  sourceId: string,
  targetId: string,
  type: IssueRelationType = 'RELATES_TO',
) {
  return prisma.issueRelation.create({ data: { sourceId, targetId, type } })
}

export function createFakeIssueVote(overrides?: Partial<IssueVote>): IssueVote {
  const now = new Date()
  return {
    id: createId(),
    issueId: createId(),
    userId: createId(),
    type: 'UP',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedIssueVote(
  issueId: string,
  userId: string,
  type: IssueVoteType = 'UP',
) {
  return prisma.issueVote.create({ data: { issueId, userId, type } })
}
