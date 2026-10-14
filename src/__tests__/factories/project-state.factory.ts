import { createId } from '@paralleldrive/cuid2'
import type { ProjectState } from '@prisma/client'
import { DEFAULT_PROJECT_STATES } from '@/src/config/project-states'
import { prisma } from '@/src/lib/prisma'

export function createFakeProjectState(
  overrides?: Partial<ProjectState>,
): ProjectState {
  const now = new Date()
  return {
    id: createId(),
    name: 'Rascunho',
    description: null,
    group: 'DRAFT',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    workspaceId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedProjectState(
  workspaceId: string,
  overrides?: Partial<
    Pick<
      ProjectState,
      'name' | 'description' | 'group' | 'color' | 'order' | 'isDefault'
    >
  >,
) {
  return prisma.projectState.create({
    data: {
      name: `State ${createId().slice(0, 6)}`,
      group: 'DRAFT',
      workspaceId,
      ...overrides,
    },
  })
}

export async function seedDefaultProjectStates(workspaceId: string) {
  await prisma.projectState.createMany({
    data: DEFAULT_PROJECT_STATES.map((state) => ({ ...state, workspaceId })),
  })
}

export async function defaultProjectStateId(workspaceId: string) {
  const existing = await prisma.projectState.findFirst({
    where: { workspaceId, isDefault: true },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.projectState.create({
    data: { name: 'Rascunho', group: 'DRAFT', isDefault: true, workspaceId },
    select: { id: true },
  })
  return created.id
}
