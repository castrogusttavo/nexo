import { cache } from 'react'
import { isPrivilegedRole } from '@/src/services/_authz'
import { ProjectService } from '@/src/services/project.service'
import type { ProjectDTO } from '@/types/project'
import { requireMembership } from './dal'

export interface ProjectContext {
  userId: string
  workspaceId: string
  workspaceSlug: string
  /** Workspace OWNER/ADMIN — may manage a project they do not lead. */
  isPrivileged: boolean
  project: ProjectDTO
}

// Session, consent (STR-61 and membership come from the DAL, which redirects
// or 404s on its own; null is left for project that does not exist.
export const getProjectContext = cache(
  async (
    workspaceSlug: string,
    projectSlug: string,
  ): Promise<ProjectContext | null> => {
    const { user, membership } = await requireMembership(workspaceSlug)

    const project = await ProjectService.getBySlug(
      user.id,
      membership.workspaceId,
      projectSlug,
    )
    if (!project.ok) return null

    return {
      userId: user.id,
      workspaceId: membership.workspaceId,
      workspaceSlug,
      isPrivileged: isPrivilegedRole(membership.role),
      project: project.value,
    }
  },
)
