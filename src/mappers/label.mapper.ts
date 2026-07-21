import type { Label } from '@prisma/client'
import type { LabelDTO } from '@/types/label'
import { withTimestamps } from './_shared'

export function toLabelDTO(label: Label): LabelDTO {
  return {
    id: label.id,
    name: label.name,
    description: label.description ?? null,
    color: label.color,
    projectId: label.projectId,
    ...withTimestamps(label),
  }
}
