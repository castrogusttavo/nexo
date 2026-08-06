import type { ActivityEntityType, Prisma } from '@prisma/client'
import { ActivityService } from './activity.service'

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value ?? null
}

export function recordFieldChanges(
  entityType: ActivityEntityType,
  entityId: string,
  actorId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): void {
  for (const field of Object.keys(after)) {
    const oldValue = normalize(before[field])
    const newValue = normalize(after[field])
    if (oldValue === newValue) continue

    void ActivityService.record({
      entityType,
      entityId,
      actorId,
      field,
      oldValue: oldValue as Prisma.InputJsonValue,
      newValue: newValue as Prisma.InputJsonValue,
    })
  }
}
