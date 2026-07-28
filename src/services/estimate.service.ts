import { auditMutation } from '@/lib/axiom/audit'
import type { EstimateSettingsDTO, EstimateValueDTO } from '@/types/estimate'
import {
  estimateSettingsForbidden,
  estimateValueForbidden,
  estimateValueLastRemaining,
  projectForbidden,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import {
  toEstimateSettingsDTO,
  toEstimateValueDTO,
} from '../mappers/estimate.mapper'
import { EstimateRepository } from '../repositories/estimate.repository'
import { EstimateValueRepository } from '../repositories/estimate-value.repository'
import type {
  CreateEstimateValueDTO,
  ReorderEstimateValuesDTO,
  UpdateEstimateSettingsDTO,
  UpdateEstimateValueDTO,
} from '../schemas/estimate.schema'
import { resolveProject } from './_project-scope'

export const EstimateService = {
  async get(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<EstimateSettingsDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await EstimateRepository.findByProjectId(project.id)
    if (!result.ok) return result

    const valuesResult = await EstimateValueRepository.listByEstimateSettingsId(
      result.value.id,
    )
    if (!valuesResult.ok) return valuesResult

    return ok(toEstimateSettingsDTO(result.value, valuesResult.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: UpdateEstimateSettingsDTO,
  ): Promise<Result<EstimateSettingsDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(estimateSettingsForbidden())
    }

    const result = await EstimateRepository.update(project.id, dto)
    if (!result.ok) return result

    const valuesResult = await EstimateValueRepository.listByEstimateSettingsId(
      result.value.id,
    )
    if (!valuesResult.ok) return valuesResult

    auditMutation({
      entity: 'estimate_settings',
      action: 'update',
      actorId,
      targetId: project.id,
      meta: { system: dto.system, model: dto.model },
    })

    return ok(toEstimateSettingsDTO(result.value, valuesResult.value))
  },

  async createValue(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateEstimateValueDTO,
  ): Promise<Result<EstimateValueDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(estimateSettingsForbidden())
    }

    const settingsResult = await EstimateRepository.findByProjectId(project.id)
    if (!settingsResult.ok) return settingsResult

    const result = await EstimateValueRepository.create(
      settingsResult.value.id,
      dto.value,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'estimate_value',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toEstimateValueDTO(result.value))
  },

  async updateValue(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    valueId: string,
    dto: UpdateEstimateValueDTO,
  ): Promise<Result<EstimateValueDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(estimateSettingsForbidden())
    }

    const existing = await EstimateValueRepository.findById(valueId)
    if (!existing.ok) return existing

    const settingsResult = await EstimateRepository.findByProjectId(project.id)
    if (!settingsResult.ok) return settingsResult
    if (existing.value.estimateSettingsId !== settingsResult.value.id) {
      return err(estimateValueForbidden())
    }

    const result = await EstimateValueRepository.update(valueId, dto.value)
    if (!result.ok) return result

    auditMutation({
      entity: 'estimate_value',
      action: 'update',
      actorId,
      targetId: valueId,
    })

    return ok(toEstimateValueDTO(result.value))
  },

  async deleteValue(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    valueId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(estimateSettingsForbidden())
    }

    const existing = await EstimateValueRepository.findById(valueId)
    if (!existing.ok) return existing

    const settingsResult = await EstimateRepository.findByProjectId(project.id)
    if (!settingsResult.ok) return settingsResult
    if (existing.value.estimateSettingsId !== settingsResult.value.id) {
      return err(estimateValueForbidden())
    }

    const countResult = await EstimateValueRepository.countByEstimateSettingsId(
      settingsResult.value.id,
    )
    if (!countResult.ok) return countResult
    if (countResult.value <= 1) return err(estimateValueLastRemaining())

    const result = await EstimateValueRepository.delete(valueId)
    if (!result.ok) return result

    auditMutation({
      entity: 'estimate_value',
      action: 'delete',
      actorId,
      targetId: valueId,
    })

    return ok(undefined)
  },

  async reorderValues(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: ReorderEstimateValuesDTO,
  ): Promise<Result<EstimateValueDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(estimateSettingsForbidden())
    }

    const settingsResult = await EstimateRepository.findByProjectId(project.id)
    if (!settingsResult.ok) return settingsResult

    const result = await EstimateValueRepository.reorder(
      settingsResult.value.id,
      dto.valueIds,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'estimate_value',
      action: 'update',
      actorId,
      targetId: settingsResult.value.id,
      reason: 'reorder',
    })

    return ok(result.value.map(toEstimateValueDTO))
  },
}
