import { createId } from '@paralleldrive/cuid2'
import type { Activity, ActivityEntityType, Prisma } from '@prisma/client'
import { prisma } from '@/src/lib/prisma'

export function createFakeActivity(overrides?: Partial<Activity>): Activity {
  const now = new Date()
  return {
    id: createId(),
    entityType: 'ISSUE',
    entityId: createId(),
    actorId: createId(),
    field: 'priority',
    oldValue: 'NONE',
    newValue: 'HIGH',
    createdAt: now,
    ...overrides,
  }
}

export function seedActivity(
  entityType: ActivityEntityType,
  entityId: string,
  actorId: string,
  overrides?: {
    field?: string
    oldValue?: Prisma.InputJsonValue
    newValue?: Prisma.InputJsonValue
  },
) {
  return prisma.activity.create({
    data: {
      entityType,
      entityId,
      actorId,
      field: 'priority',
      oldValue: 'NONE',
      newValue: 'HIGH',
      ...overrides,
    },
  })
}
