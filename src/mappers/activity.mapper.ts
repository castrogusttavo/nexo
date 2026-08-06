import type { ActivityDTO } from '@/types/activity'
import type { ActivityWithActor } from '../repositories/activity.repository'

export function toActivityDTO(activity: ActivityWithActor): ActivityDTO {
  return {
    id: activity.id,
    entityType: activity.entityType,
    entityId: activity.entityId,
    field: activity.field,
    oldValue: activity.oldValue,
    newValue: activity.newValue,
    actor: activity.actor,
    createdAt: activity.createdAt.toISOString(),
  }
}
