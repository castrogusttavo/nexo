import type { Workspace } from '@prisma/client'
import type { WorkspaceDTO } from '@/types/workspace'

export function toWorkspaceDTO(workspace: Workspace): WorkspaceDTO {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    activePlan: workspace.activePlan,
    trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
  }
}
