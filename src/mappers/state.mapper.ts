import type { State } from '@prisma/client'
import type { StateDTO } from '@/types/state'
import { withTimestamps } from './_shared'

export function toStateDTO(state: State): StateDTO {
  return {
    id: state.id,
    name: state.name,
    description: state.description ?? null,
    group: state.group,
    color: state.color,
    order: state.order,
    isDefault: state.isDefault,
    projectId: state.projectId,
    ...withTimestamps(state),
  }
}
