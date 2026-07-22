import { auditMutation } from '@/lib/axiom/audit'
import type { EstimateSettingsDTO } from '@/types/estimate'
import { estimateSettingsForbidden, projectForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toEstimateSettingsDTO } from '../mappers/estimate.mapper'
import { EstimateRepository } from '../repositories/estimate.repository'
import type { UpdateEstimateSettingsDTO } from '../schemas/estimate.schema'
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

    return ok(toEstimateSettingsDTO(result.value))
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

    auditMutation({
      entity: 'estimate_settings',
      action: 'update',
      actorId,
      targetId: project.id,
      meta: { system: dto.system, model: dto.model },
    })

    return ok(toEstimateSettingsDTO(result.value))
  },
}
