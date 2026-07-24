import { auditMutation } from '@/lib/axiom/audit'
import type { CycleDTO, CycleMemberDTO } from '@/types/cycle'
import {
  cycleAlreadyActive,
  cycleForbidden,
  cycleNotFound,
  projectForbidden,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toCycleDTO, toCycleMemberDTO } from '../mappers/cycle.mapper'
import { CycleRepository } from '../repositories/cycle.repository'
import type { CreateCycleDTO, UpdateCycleDTO } from '../schemas/cycle.schema'
import { resolveProject } from './_project-scope'

export const CycleService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<CycleDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await CycleRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map(toCycleDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateCycleDTO,
  ): Promise<Result<CycleDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(cycleForbidden())
    }

    if (dto.status === 'IN_PROGRESS') {
      const activeResult = await CycleRepository.findActiveByProject(project.id)
      if (!activeResult.ok) return activeResult
      if (activeResult.value) return err(cycleAlreadyActive())
    }

    const result = await CycleRepository.create({
      name: dto.name,
      description: dto.description,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      leadId: actorId,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'cycle',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'cycle',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toCycleDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    cycleId: string,
    dto: UpdateCycleDTO,
  ): Promise<Result<CycleDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(cycleForbidden())
    }

    const cycleResult = await CycleRepository.findById(cycleId)
    if (!cycleResult.ok) return cycleResult
    if (cycleResult.value.projectId !== project.id) {
      return err(cycleNotFound())
    }

    if (dto.status === 'IN_PROGRESS') {
      const activeResult = await CycleRepository.findActiveByProject(project.id)
      if (!activeResult.ok) return activeResult
      if (activeResult.value && activeResult.value.id !== cycleId) {
        return err(cycleAlreadyActive())
      }
    }

    const result = await CycleRepository.update(cycleId, {
      ...dto,
      startDate:
        dto.startDate === undefined
          ? undefined
          : dto.startDate === null
            ? null
            : new Date(dto.startDate),
      endDate:
        dto.endDate === undefined
          ? undefined
          : dto.endDate === null
            ? null
            : new Date(dto.endDate),
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'cycle',
      action: 'update',
      actorId,
      targetId: cycleId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toCycleDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    cycleId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(cycleForbidden())
    }

    const cycleResult = await CycleRepository.findById(cycleId)
    if (!cycleResult.ok) return cycleResult
    if (cycleResult.value.projectId !== project.id) {
      return err(cycleNotFound())
    }

    const result = await CycleRepository.delete(cycleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'cycle',
      action: 'delete',
      actorId,
      targetId: cycleId,
    })

    return ok(undefined)
  },

  async listMembers(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    cycleId: string,
  ): Promise<Result<CycleMemberDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const cycleResult = await CycleRepository.findById(cycleId)
    if (!cycleResult.ok) return cycleResult
    if (cycleResult.value.projectId !== project.id) {
      return err(cycleNotFound())
    }

    const result = await CycleRepository.listmembers(cycleId)
    if (!result.ok) return result

    return ok(
      result.value.map((m) => toCycleMemberDTO(m, cycleResult.value.leadId)),
    )
  },

  async addMember(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    cycleId: string,
    targetUserId: string,
  ): Promise<Result<CycleMemberDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(cycleForbidden())
    }

    const cycleResult = await CycleRepository.findById(cycleId)
    if (!cycleResult.ok) return cycleResult
    if (cycleResult.value.projectId !== project.id) {
      return err(cycleNotFound())
    }

    const result = await CycleRepository.addMember(targetUserId, cycleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'cycle',
      action: 'update',
      actorId,
      targetId: cycleId,
      reason: 'member_added',
      meta: { targetUserId },
    })

    return ok(toCycleMemberDTO(result.value, cycleResult.value.leadId))
  },

  async removeMember(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    cycleId: string,
    targetUserId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(cycleForbidden())
    }

    const cycleResult = await CycleRepository.findById(cycleId)
    if (!cycleResult.ok) return cycleResult
    if (cycleResult.value.projectId !== project.id) {
      return err(cycleNotFound())
    }

    if (targetUserId === cycleResult.value.leadId) {
      return err(cycleForbidden('Não é possível remover o lead do ciclo'))
    }

    const result = await CycleRepository.removeMember(targetUserId, cycleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'cycle',
      action: 'update',
      actorId,
      targetId: cycleId,
      reason: 'member_removed',
      meta: { targetUserId },
    })

    return ok(undefined)
  },
}
