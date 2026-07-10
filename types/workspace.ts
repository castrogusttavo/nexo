export interface WorkspaceDTO {
  id: string
  name: string
  slug: string
  activePlan: string
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}
