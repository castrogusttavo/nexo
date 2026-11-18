import type { Result } from '@/src/lib/result'
import { ok } from '@/src/lib/result'
import { summarizeProjectReactions } from '@/src/mappers/project-resource.mapper'
import { ProjectReactionRepository } from '@/src/repositories/project-reaction.repository'
import type { ProjectReactionSummaryDTO } from '@/types/project-reaction'
import { authorizeProject } from './_project-scope'

export const ProjectReactionService = {
  async list(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectReactionSummaryDTO[]>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'read')
    if (!project.ok) return project

    const rows = await ProjectReactionRepository.listByProject(project.value.id)
    if (!rows.ok) return rows

    return ok(summarizeProjectReactions(rows.value, actorId))
  },

  async react(
    actorId: string,
    workspaceId: string,
    slug: string,
    emoji: string,
  ): Promise<Result<void>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'react')
    if (!project.ok) return project

    return ProjectReactionRepository.add({
      projectId: project.value.id,
      userId: actorId,
      emoji,
    })
  },

  async unreact(
    actorId: string,
    workspaceId: string,
    slug: string,
    emoji: string,
  ): Promise<Result<void>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'react')
    if (!project.ok) return project

    return ProjectReactionRepository.remove({
      projectId: project.value.id,
      userId: actorId,
      emoji,
    })
  },
}
