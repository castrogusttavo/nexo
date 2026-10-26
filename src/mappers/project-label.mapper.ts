import type { ProjectLabel } from '@prisma/client'
import type { ProjectLabelDTO } from '@/types/project-label'
import { withTimestamps } from './_shared'

export function toProjectLabelDTO(label: ProjectLabel): ProjectLabelDTO {
  return {
    id: label.id,
    name: label.name,
    description: label.description ?? null,
    color: label.color,
    workspaceId: label.workspaceId,
    ...withTimestamps(label),
  }
}
