import { createId } from '@paralleldrive/cuid2'
import type { ProjectLabel } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeProjectLabel(
  overrides?: Partial<ProjectLabel>,
): ProjectLabel {
  const now = new Date()
  return {
    id: createId(),
    name: 'Marketing',
    description: null,
    color: 'ZINC',
    workspaceId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Unique names by default: the table is unique on (workspaceId, name), so
// two bare seeds in one workspace must not collide.
export async function seedProjectLabel(
  workspaceId: string,
  overrides?: Partial<Pick<ProjectLabel, 'name' | 'description' | 'color'>>,
) {
  return prisma.projectLabel.create({
    data: {
      name: `Label ${createId().slice(0, 6)}`,
      workspaceId,
      ...overrides,
    },
  })
}

// Puts labels on a project directly, skipping the service's rules.
export async function assignProjectLabels(
  projectId: string,
  labelIds: string[],
) {
  await prisma.projectLabelAssignment.createMany({
    data: labelIds.map((labelId) => ({ projectId, labelId })),
  })
}
