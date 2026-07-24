import { createId } from '@paralleldrive/cuid2'
import type { Cycle, CycleMember } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeCycle(overrides?: Partial<Cycle>): Cycle {
  const now = new Date()
  return {
    id: createId(),
    name: 'Text Cycle',
    description: null,
    status: 'IN_PROGRESS',
    startDate: null,
    endDate: null,
    leadId: createId(),
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedCycle(
  projectId: string,
  leadId: string,
  overrides?: Partial<
    Pick<Cycle, 'name' | 'description' | 'status' | 'startDate' | 'endDate'>
  >,
) {
  return prisma.cycle.create({
    data: {
      name: 'Seed Cycle',
      projectId,
      leadId,
      ...overrides,
    },
  })
}

export async function seedCycleMember(data: {
  userId: string
  cycleId: string
}): Promise<CycleMember> {
  return prisma.cycleMember.create({ data })
}
