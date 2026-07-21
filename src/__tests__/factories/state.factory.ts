import { createId } from '@paralleldrive/cuid2'
import type { State } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeState(overrides?: Partial<State>): State {
  const now = new Date()
  return {
    id: createId(),
    name: 'Todo',
    description: null,
    group: 'UNSTARTED',
    color: 'ZINC',
    order: 0,
    isDefault: false,
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedState(
  projectId: string,
  overrides?: Partial<
    Pick<
      State,
      'name' | 'description' | 'group' | 'color' | 'order' | 'isDefault'
    >
  >,
) {
  return prisma.state.create({
    data: {
      name: 'Todo',
      group: 'UNSTARTED',
      projectId,
      ...overrides,
    },
  })
}
