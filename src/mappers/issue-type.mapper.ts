import type { IssueType } from '@prisma/client'
import type { IssueTypeDTO } from '@/types/issue-type'
import { withTimestamps } from './_shared'

export function toIssueTypeDTO(type: IssueType): IssueTypeDTO {
  return {
    id: type.id,
    name: type.name,
    description: type.description ?? null,
    color: type.color,
    icon: type.icon,
    isSystem: type.isSystem,
    order: type.order,
    projectId: type.projectId,
    ...withTimestamps(type),
  }
}
