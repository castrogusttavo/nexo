import { createId } from '@paralleldrive/cuid2'
import type { IssueType } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeIssueType(overrides?: Partial<IssueType>): IssueType {
  const now = new Date()
  return {
    id: createId(),
    name: 'Task',
    description: null,
    color: 'ZINC',
    icon: 'task-icon',
    isSystem: false,
    order: 0,
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function seedIssueType(
  projectId: string,
  overrides?: Partial<
    Pick<
      IssueType,
      'name' | 'description' | 'color' | 'icon' | 'isSystem' | 'order'
    >
  >,
) {
  return prisma.issueType.create({
    data: {
      name: 'Task',
      icon: 'task-icon',
      projectId,
      ...overrides,
    },
  })
}
