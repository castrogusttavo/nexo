import type { Result } from '@/src/lib/result'
import { ok } from '@/src/lib/result'
import { buildProjectProgress } from '@/src/mappers/project-progress.mapper'
import { ProjectProgressRepository } from '@/src/repositories/project-progress.repository'
import type { ProjectProgressDTO } from '@/types/project-progress'
import { authorizeProject } from './_project-scope'

export const ProjectProgressService = {
  async get(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectProgressDTO>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'read')
    if (!project.ok) return project

    const counts = await ProjectProgressRepository.countByStateGroup(
      project.value.id,
    )
    if (!counts.ok) return counts

    return ok(buildProjectProgress(counts.value))
  },
}
