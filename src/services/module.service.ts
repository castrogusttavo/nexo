import { auditMutation } from '@/lib/axiom/audit'
import type { ModuleDTO, ModuleMemberDTO } from '@/types/module'
import { moduleForbidden, moduleNotFound, projectForbidden } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toModuleDTO, toModuleMemberDTO } from '../mappers/module.mapper'
import { ModuleRepository } from '../repositories/module.repository'
import type { CreateModuleDTO, UpdateModuleDTO } from '../schemas/module.schema'
import { recordFieldChanges } from './_activity-diff'
import { resolveProject } from './_project-scope'

export const ModuleService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<ModuleDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await ModuleRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map((m) => toModuleDTO(m)))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateModuleDTO,
  ): Promise<Result<ModuleDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(moduleForbidden())
    }

    const result = await ModuleRepository.create({
      name: dto.name,
      status: dto.status,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      leadId: actorId,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'module',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'module',
      action: 'create',
      actorId,
      reason: result.value.id,
    })

    return ok(toModuleDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
    dto: UpdateModuleDTO,
  ): Promise<Result<ModuleDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(moduleForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.update(moduleId, {
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

    recordFieldChanges(
      'MODULE',
      moduleId,
      actorId,
      {
        status: moduleResult.value.status,
        startDate: moduleResult.value.startDate,
        endDate: moduleResult.value.endDate,
        progress: moduleResult.value.progress,
      },
      {
        status: dto.status ?? moduleResult.value.status,
        startDate:
          dto.startDate === undefined
            ? moduleResult.value.startDate
            : new Date(dto.startDate),
        endDate:
          dto.endDate === undefined
            ? moduleResult.value.endDate
            : new Date(dto.endDate),
        progress: dto.progress ?? moduleResult.value.progress,
      },
    )

    auditMutation({
      entity: 'module',
      action: 'update',
      actorId,
      targetId: moduleId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toModuleDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(moduleForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.delete(moduleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'module',
      action: 'delete',
      actorId,
      targetId: moduleId,
    })

    return ok(undefined)
  },

  async listMembers(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
  ): Promise<Result<ModuleMemberDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.listMembers(moduleId)
    if (!result.ok) return result

    return ok(
      result.value.map((m) => toModuleMemberDTO(m, moduleResult.value.leadId)),
    )
  },

  async addMember(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
    targetUserId: string,
  ): Promise<Result<ModuleMemberDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(moduleForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.addMember(targetUserId, moduleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'module',
      action: 'update',
      actorId,
      targetId: moduleId,
      reason: 'member_added',
      meta: { targetUserId },
    })

    return ok(toModuleMemberDTO(result.value, moduleResult.value.leadId))
  },

  async removeMember(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
    targetUserId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(moduleForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    if (targetUserId === moduleResult.value.leadId) {
      return err(moduleForbidden('Não é possível remover o lead do módulo'))
    }

    const result = await ModuleRepository.removeMember(targetUserId, moduleId)
    if (!result.ok) return result

    auditMutation({
      entity: 'module',
      action: 'update',
      actorId,
      targetId: moduleId,
      reason: 'member_removed',
      meta: { targetUserId },
    })

    return ok(undefined)
  },

  async favorite(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
  ): Promise<Result<{ favorited: boolean }>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.addFavorite(actorId, moduleId)
    if (!result.ok) return result

    return ok({ favorited: true })
  },

  async unfavorite(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    moduleId: string,
  ): Promise<Result<{ favorited: boolean }>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const moduleResult = await ModuleRepository.findById(moduleId)
    if (!moduleResult.ok) return moduleResult
    if (moduleResult.value.projectId !== project.id) {
      return err(moduleNotFound())
    }

    const result = await ModuleRepository.removeFavorite(actorId, moduleId)
    if (!result.ok) return result

    return ok({ favorited: false })
  },
}
