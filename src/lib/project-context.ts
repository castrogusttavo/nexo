import { cache } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipService } from '@/src/services/membership.service'
import { ProjectService } from '@/src/services/project.service'
import type { ProjectDTO } from '@/types/project'

export interface ProjectContext {
  userId: string
  workspaceId: string
  workspaceSlug: string
  project: ProjectDTO
}

export const getProjectContext = cache(
  async (
    workspaceSlug: string,
    projectSlug: string,
  ): Promise<ProjectContext | null> => {
    const session = await getAuthSession()
    if (!session.ok) return null

    const membership = await MembershipService.getByUserAndSlug(
      session.value.user.id,
      workspaceSlug,
    )
    if (!membership.ok || !membership.value) return null

    const project = await ProjectService.getBySlug(
      session.value.user.id,
      membership.value.workspaceId,
      projectSlug,
    )
    if (!project.ok) return null

    return {
      userId: session.value.user.id,
      workspaceId: membership.value.workspaceId,
      workspaceSlug,
      project: project.value,
    }
  },
)
