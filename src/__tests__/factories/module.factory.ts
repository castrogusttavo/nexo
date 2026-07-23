import { createId } from '@paralleldrive/cuid2'
import type { Module, ModuleMember } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeModule(overrides?: Partial<Module>): Module {
  const now = new Date()
  return {
    id: createId(),
    name: 'Text Module',
    progress: 0,
    status: 'BACKLOG',
    startDate: null,
    endDate: null,
    leadId: createId(),
    projectId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedModule(
  projectId: string,
  leadId: string,
  overrides?: Partial<
    Pick<Module, 'name' | 'progress' | 'status' | 'startDate' | 'endDate'>
  >,
) {
  return prisma.module.create({
    data: {
      name: 'Seed Module',
      projectId,
      leadId,
      ...overrides,
    },
  })
}

export async function seedModuleMember(data: {
  userId: string
  moduleId: string
}): Promise<ModuleMember> {
  return prisma.moduleMember.create({ data })
}
