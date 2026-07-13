import type { Plan } from '@prisma/client'

export interface WorkspaceDTO {
  id: string
  name: string
  slug: string
  activePlan: Plan
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}
