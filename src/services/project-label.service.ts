import { auditMutation } from '@/lib/axiom/audit'
import type { ProjectLabelDTO } from '@/types/project-label'
import { projectLabelForbidden, projectLabelNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toProjectLabelDTO } from '../mappers/project-label.mapper'
import { ProjectLabelRepository } from '../repositories/project-label.repository'
import type {
  CreateProjectLabelDTO,
  UpdateProjectLabelDTO,
} from '../schemas/project-label.schema'
import { assertMember } from './_authz'

// Any member reads the labels; only OWNER/ADMIN configure them, even while
// the workspace switch is off, so an admin can prepare them first.
async function assertCanConfigure(
  actorId: string,
  workspaceId: string,
): Promise<Result<void>> {
  const membership = await assertMember(actorId, workspaceId)
  if (!membership.ok) return membership
  if (!membership.value.isPrivileged) return err(projectLabelForbidden())
  return ok(undefined)
}

// A label of another workspace answers as missing, so an id from elsewhere
// reveals nothing about it.
async function findOwnLabel(labelId: string, workspaceId: string) {
  const label = await ProjectLabelRepository.findById(labelId)
  if (!label.ok) return label
  if (label.value.workspaceId !== workspaceId) {
    return err(projectLabelNotFound())
  }
  return label
}

export const ProjectLabelService = {
  async list(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<ProjectLabelDTO[]>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    const result = await ProjectLabelRepository.listByWorkspace(workspaceId)
    if (!result.ok) return result

    return ok(result.value.map(toProjectLabelDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    dto: CreateProjectLabelDTO,
  ): Promise<Result<ProjectLabelDTO>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const result = await ProjectLabelRepository.create({ ...dto, workspaceId })
    if (!result.ok) {
      auditMutation({
        entity: 'project_label',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'project_label',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toProjectLabelDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    labelId: string,
    dto: UpdateProjectLabelDTO,
  ): Promise<Result<ProjectLabelDTO>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const label = await findOwnLabel(labelId, workspaceId)
    if (!label.ok) return label

    const result = await ProjectLabelRepository.update(labelId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'project_label',
      action: 'update',
      actorId,
      targetId: labelId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toProjectLabelDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    labelId: string,
  ): Promise<Result<void>> {
    const allowed = await assertCanConfigure(actorId, workspaceId)
    if (!allowed.ok) return allowed

    const label = await findOwnLabel(labelId, workspaceId)
    if (!label.ok) return label

    const result = await ProjectLabelRepository.delete(labelId)
    if (!result.ok) return result

    auditMutation({
      entity: 'project_label',
      action: 'delete',
      actorId,
      targetId: labelId,
    })

    return ok(undefined)
  },
}
