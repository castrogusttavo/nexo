import { auditMutation } from '@/lib/axiom/audit'
import type { LabelDTO } from '@/types/label'
import { labelForbidden, labelNotFound, projectForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toLabelDTO } from '../mappers/label.mapper'
import { LabelRepository } from '../repositories/label.repository'
import type { CreateLabelDTO, UpdateLabelDTO } from '../schemas/label.schema'
import { resolveProject } from './_project-scope'

export const LabelService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<LabelDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await LabelRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map(toLabelDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateLabelDTO,
  ): Promise<Result<LabelDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(labelForbidden())
    }

    const result = await LabelRepository.create({
      ...dto,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'label',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'label',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toLabelDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    labelId: string,
    dto: UpdateLabelDTO,
  ): Promise<Result<LabelDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(labelForbidden())
    }

    const labelResult = await LabelRepository.findById(labelId)
    if (!labelResult.ok) return labelResult
    if (labelResult.value.projectId !== project.id) return err(labelNotFound())

    const result = await LabelRepository.update(labelId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'label',
      action: 'update',
      actorId,
      targetId: labelId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toLabelDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    labelId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(labelForbidden())
    }

    const labelResult = await LabelRepository.findById(labelId)
    if (!labelResult.ok) return labelResult
    if (labelResult.value.projectId !== project.id) return err(labelNotFound())

    const result = await LabelRepository.delete(labelId)
    if (!result.ok) return result

    auditMutation({
      entity: 'label',
      action: 'delete',
      actorId,
      targetId: labelId,
    })

    return ok(undefined)
  },
}
