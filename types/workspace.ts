import type { Plan } from '@prisma/client'

export interface WorkspaceDTO {
  id: string
  name: string
  slug: string
  activePlan: Plan
  trialEndsAt: string | null
  projectStatesEnabled: boolean
  projectLabelsEnabled: boolean
  image: string | null
  teamSize: string | null
  timezone: string
  createdAt: string
  updatedAt: string
}
