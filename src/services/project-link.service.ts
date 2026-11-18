import { auditMutation } from '@/lib/axiom/audit'
import { projectLinkLimitReached, projectLinkNotFound } from '@/src/errors'
import type { Result } from '@/src/lib/result'
import { err, ok } from '@/src/lib/result'
import { toProjectLinkDTO } from '@/src/mappers/project-resource.mapper'
import { ProjectLinkRepository } from '@/src/repositories/project-link.repository'
import type {
  CreateProjectLinkDTO,
  UpdateProjectLinkDTO,
} from '@/src/schemas/project-link.schema'
import type { ProjectLinkDTO } from '@/types/project-link'
import { authorizeProject } from './_project-scope'

const MAX_LINKS = 20

export const ProjectLinkService = {
  async list(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectLinkDTO[]>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'read')
    if (!project.ok) return project

    const links = await ProjectLinkRepository.listByProject(project.value.id)
    if (!links.ok) return links

    return ok(links.value.map(toProjectLinkDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    slug: string,
    dto: CreateProjectLinkDTO,
  ): Promise<Result<ProjectLinkDTO>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'manage')
    if (!project.ok) return project

    const count = await ProjectLinkRepository.countByProject(project.value.id)
    if (!count.ok) return count
    if (count.value >= MAX_LINKS) return err(projectLinkLimitReached())

    const created = await ProjectLinkRepository.create({
      projectId: project.value.id,
      url: dto.url,
      title: dto.title || null,
      createdById: actorId,
    })
    if (!created.ok) return created

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.value.id,
      reason: 'add_link',
      meta: { linkId: created.value.id },
    })

    return ok(toProjectLinkDTO(created.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    slug: string,
    linkId: string,
    dto: UpdateProjectLinkDTO,
  ): Promise<Result<ProjectLinkDTO>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'manage')
    if (!project.ok) return project

    const link = await ProjectLinkRepository.findById(linkId)
    if (!link.ok) return link
    if (link.value.projectId !== project.value.id)
      return err(projectLinkNotFound())

    const updated = await ProjectLinkRepository.update(linkId, {
      ...(dto.url !== undefined && { url: dto.url }),
      ...(dto.title !== undefined && { title: dto.title || null }),
    })
    if (!updated.ok) return updated

    return ok(toProjectLinkDTO(updated.value))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    slug: string,
    linkId: string,
  ): Promise<Result<void>> {
    const project = await authorizeProject(actorId, workspaceId, slug, 'manage')
    if (!project.ok) return project

    const link = await ProjectLinkRepository.findById(linkId)
    if (!link.ok) return link
    if (link.value.projectId !== project.value.id)
      return err(projectLinkNotFound())

    const removed = await ProjectLinkRepository.delete(linkId)
    if (!removed) return removed

    auditMutation({
      entity: 'project',
      action: 'update',
      actorId,
      targetId: project.value.id,
      reason: 'remove_link',
      meta: { linkId },
    })

    return ok(undefined)
  },
}
