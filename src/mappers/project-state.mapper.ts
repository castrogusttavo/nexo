import type { ProjectState } from '@prisma/client'
import type { ProjectStateDTO } from '@/types/project-state'
import { withTimestamps } from './_shared'

export function toProjectStateDTO(state: ProjectState): ProjectStateDTO {
  return {
    id: state.id,
    name: state.name,
    description: state.description ?? null,
    group: state.group,
    color: state.color,
    order: state.order,
    isDefault: state.isDefault,
    workspaceId: state.workspaceId,
    ...withTimestamps(state),
  }
}
