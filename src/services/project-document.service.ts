import { auditMutation } from '@/lib/axiom/audit'
import type { ProjectDocumentDTO } from '@/types/project-document'
import { projectForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toProjectDocumentDTO } from '../mappers/project-document.mapper'
import { ProjectDocumentRepository } from '../repositories/project-document.repository'
import type { UpdateProjectDocumentDTO } from '../schemas/project-document.schema'
import { assertMember } from './_authz'
import { projectAccess, resolveProject } from './_project-scope'

export const ProjectDocumentService = {
  async get(
    actorId: string,
    workspaceId: string,
    slug: string,
  ): Promise<Result<ProjectDocumentDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, slug)
    if (!resolved.ok) return err(resolved.error)

    const { canRead } = projectAccess(
      resolved.project,
      resolved.membership,
      actorId,
    )
    if (!canRead) return err(projectForbidden())

    return ok(toProjectDocumentDTO(resolved.project))
  },

  // Snapshot autosave. The live content travels over Yjs; this keeps the flat
  // JSON current for reads that never open a socket.
  async update(
    actorId: string,
    workspaceId: string,
    slug: string,
    dto: UpdateProjectDocumentDTO,
  ): Promise<Result<ProjectDocumentDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, slug)
    if (!resolved.ok) return err(resolved.error)

    const { project, membership } = resolved
    const { canWrite } = projectAccess(project, membership, actorId)
    if (!canWrite) {
      auditMutation({
        entity: 'project',
        action: 'update',
        actorId,
        targetId: project.id,
        outcome: 'failure',
        reason: 'insufficient_role',
      })
      return err(
        projectForbidden(
          'Apenas o lead ou ADMIN/OWNER podem editar o documento do projeto',
        ),
      )
    }

    const saved = await ProjectDocumentRepository.updateContent(
      project.id,
      dto.content as never,
    )
    if (!saved.ok) return saved

    return ok(toProjectDocumentDTO(saved.value))
  },

  // Called by the realtime server, which knows the project id, not the slug.
  async authorizeRealtime(
    actorId: string,
    projectId: string,
  ): Promise<Result<{ workspaceId: string; canWrite: boolean }>> {
    const project = await ProjectDocumentRepository.findAccessById(projectId)
    if (!project.ok) return project

    const membership = await assertMember(actorId, project.value.workspaceId)
    if (!membership.ok) return membership

    const { canRead, canWrite } = projectAccess(
      project.value,
      membership.value,
      actorId,
    )
    if (!canRead) return err(projectForbidden())

    return ok({ workspaceId: project.value.workspaceId, canWrite })
  },
}
