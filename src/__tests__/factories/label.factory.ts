import { createId } from '@paralleldrive/cuid2'
import type { Label } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeLabel(overrides?: Partial<Label>): Label {
  const now = new Date()
  return {
    id: createId(),
    name: 'Design',
    description: null,
    color: 'ZINC',
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedLabel(
  projectId: string,
  overrides?: Partial<Pick<Label, 'name' | 'description' | 'color'>>,
) {
  return prisma.label.create({
    data: {
      name: 'Design',
      projectId,
      ...overrides,
    },
  })
}
