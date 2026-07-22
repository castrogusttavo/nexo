import { auditMutation } from '@/lib/axiom/audit'
import type { StateDTO } from '@/types/state'
import {
  projectForbidden,
  stateForbidden,
  stateIsDefault,
  stateLastInGroup,
  stateNotFound,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toStateDTO } from '../mappers/state.mapper'
import { StateRepository } from '../repositories/state.repository'
import type { CreateStateDTO, UpdateStateDTO } from '../schemas/state.schema'
import { resolveProject } from './_project-scope'

export const StateService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<StateDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await StateRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map(toStateDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateStateDTO,
  ): Promise<Result<StateDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(stateForbidden())
    }

    const result = await StateRepository.create({
      ...dto,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'state',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'state',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toStateDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    stateId: string,
    dto: UpdateStateDTO,
  ): Promise<Result<StateDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(stateForbidden())
    }

    const stateResult = await StateRepository.findById(stateId)
    if (!stateResult.ok) return stateResult
    if (stateResult.value.projectId !== project.id) return err(stateNotFound())

    const result = await StateRepository.update(stateId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'state',
      action: 'update',
      actorId,
      targetId: stateId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toStateDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    stateId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(stateForbidden())
    }

    const stateResult = await StateRepository.findById(stateId)
    if (!stateResult.ok) return stateResult
    const state = stateResult.value
    if (state.projectId !== project.id) return err(stateNotFound())

    if (state.isDefault) return err(stateIsDefault())

    const countResult = await StateRepository.countByGroup(
      project.id,
      state.group,
    )
    if (!countResult.ok) return countResult
    if (countResult.value <= 1) return err(stateLastInGroup())

    const result = await StateRepository.delete(stateId)
    if (!result.ok) return result

    auditMutation({
      entity: 'state',
      action: 'delete',
      actorId,
      targetId: stateId,
    })

    return ok(undefined)
  },

  async setDefault(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    stateId: string,
  ) {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(stateForbidden())
    }

    const stateResult = await StateRepository.findById(stateId)
    if (!stateResult.ok) return stateResult
    if (stateResult.value.projectId !== project.id) return err(stateNotFound())

    const result = await StateRepository.setDefault(stateId, project.id)
    if (!result.ok) return result

    auditMutation({
      entity: 'state',
      action: 'update',
      actorId,
      targetId: stateId,
      reason: 'set_default',
    })

    return ok(toStateDTO(result.value))
  },
}
