import type { Plan } from '@prisma/client'

export interface WorkspaceDTO {
  id: string
  name: string
  slug: string
  activePlan: Plan
  trialEndsAt: string | null
  projectStatesEnabled: boolean
  createdAt: string
  updatedAt: string
}
