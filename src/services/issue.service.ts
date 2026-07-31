import type { Prisma } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { IssueDTO } from '@/types/issue'
import {
  cycleNotFound,
  estimateValueNotFound,
  issueForbidden,
  issueNotFound,
  issueParentCycle,
  issueStateInvalid,
  issueTypeInvalid,
  moduleNotFound,
  projectForbidden,
  validationError,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toIssueDTO } from '../mappers/issue.mapper'
import { CycleRepository } from '../repositories/cycle.repository'
import { EstimateRepository } from '../repositories/estimate.repository'
import { EstimateValueRepository } from '../repositories/estimate-value.repository'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueTypeRepository } from '../repositories/issue-type.repository'
import { ModuleRepository } from '../repositories/module.repository'
import { StateRepository } from '../repositories/state.repository'
import type { CreateIssueDTO, UpdateIssueDTO } from '../schemas/issue.schema'
import { resolveProject } from './_project-scope'

async function resolveDefaultTypeId(
  projectId: string,
): Promise<Result<string>> {
  const result = await IssueTypeRepository.listByProject(projectId)
  if (!result.ok) return result

  const task = result.value.find((t) => t.isSystem && t.name === 'Task')
  if (!task) return err(issueTypeInvalid())

  return ok(task.id)
}

async function assertAssociations(
  projectId: string,
  dto: {
    cycleId?: string | null
    moduleId?: string | null
    estimateValueId?: string | null
  },
): Promise<Result<void>> {
  if (dto.cycleId) {
    const cycle = await CycleRepository.findById(dto.cycleId)
    if (!cycle.ok) return cycle
    if (cycle.value.projectId !== projectId) return err(cycleNotFound())
  }

  if (dto.moduleId) {
    const module = await ModuleRepository.findById(dto.moduleId)
    if (!module.ok) return module
    if (module.value.projectId !== projectId) return err(moduleNotFound())
  }

  if (dto.estimateValueId) {
    const value = await EstimateValueRepository.findById(dto.estimateValueId)
    if (!value.ok) return value

    const settings = await EstimateRepository.findByProjectId(projectId)
    if (!settings.ok) return settings
    if (value.value.estimateSettingsId !== settings.value.id) {
      return err(estimateValueNotFound())
    }
  }

  return ok(undefined)
}

async function assertNoParentCycle(
  issueId: string,
  parentId: string,
): Promise<Result<void>> {
  let currentId: string | null = parentId
  const seen = new Set<string>()

  while (currentId) {
    if (currentId === issueId) return err(issueParentCycle())
    if (seen.has(currentId)) break
    seen.add(currentId)

    const parent = await IssueRepository.findById(currentId)
    if (!parent.ok) return parent
    currentId = parent.value.parentId
  }

  return ok(undefined)
}

async function assertParent(
  projectId: string,
  parentId: string,
  issueId?: string,
): Promise<Result<void>> {
  const parent = await IssueRepository.findById(parentId)
  if (!parent.ok) return parent
  if (parent.value.projectId !== projectId) return err(issueNotFound())

  if (issueId) return assertNoParentCycle(issueId, parentId)

  return ok(undefined)
}

function assertDateOrder(
  startDate: Date | null,
  dueDate: Date | null,
): Result<void> {
  if (startDate && dueDate && dueDate < startDate) {
    return err(
      validationError(
        'A data de vencimento não pode ser anterior à data de início',
      ),
    )
  }
  return ok(undefined)
}

export const IssueService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<IssueDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await IssueRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map(toIssueDTO))
  },

  async listChildren(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const issueResult = await IssueRepository.findById(issueId)
    if (!issueResult.ok) return issueResult
    if (issueResult.value.projectId !== project.id) return err(issueNotFound())

    const result = await IssueRepository.listChildren(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toIssueDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateIssueDTO,
  ): Promise<Result<IssueDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const stateResult = await StateRepository.findById(dto.stateId)
    if (!stateResult.ok) return stateResult
    if (stateResult.value.projectId !== project.id) {
      return err(issueStateInvalid())
    }

    let typeId = dto.typeId
    if (typeId) {
      const typeResult = await IssueTypeRepository.findById(typeId)
      if (!typeResult.ok) return typeResult
      if (typeResult.value.projectId !== project.id) {
        return err(issueTypeInvalid())
      }
    } else {
      const defaultType = await resolveDefaultTypeId(project.id)
      if (!defaultType.ok) return defaultType

      typeId = defaultType.value
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : null
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : null

    const dateCheck = assertDateOrder(startDate, dueDate)
    if (!dateCheck.ok) return dateCheck

    const assocCheck = await assertAssociations(project.id, dto)
    if (!assocCheck.ok) return assocCheck

    if (dto.parentId) {
      const parentCheck = await assertParent(project.id, dto.parentId)
      if (!parentCheck.ok) return parentCheck
    }

    const result = await IssueRepository.create({
      ...dto,
      description: dto.description as Prisma.InputJsonValue,
      startDate: startDate ?? undefined,
      dueDate: dueDate ?? undefined,
      typeId,
      authorId: actorId,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'issue',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'issue',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toIssueDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: UpdateIssueDTO,
  ): Promise<Result<IssueDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueResult = await IssueRepository.findById(issueId)
    if (!issueResult.ok) return issueResult
    if (issueResult.value.projectId !== project.id) return err(issueNotFound())

    if (dto.stateId) {
      const stateResult = await StateRepository.findById(dto.stateId)
      if (!stateResult.ok) return stateResult
      if (stateResult.value.projectId !== project.id) {
        return err(issueStateInvalid())
      }
    }

    if (dto.typeId) {
      const typeResult = await IssueTypeRepository.findById(dto.typeId)
      if (!typeResult.ok) return typeResult
      if (typeResult.value.projectId !== project.id) {
        return err(issueTypeInvalid())
      }
    }

    const issue = issueResult.value

    const startDate =
      dto.startDate === undefined
        ? issue.startDate
        : dto.startDate === null
          ? null
          : new Date(dto.startDate)
    const dueDate =
      dto.dueDate === undefined
        ? issue.dueDate
        : dto.dueDate === null
          ? null
          : new Date(dto.dueDate)

    const dateCheck = assertDateOrder(startDate, dueDate)
    if (!dateCheck.ok) return dateCheck

    const assocCheck = await assertAssociations(project.id, dto)
    if (!assocCheck.ok) return assocCheck

    if (dto.parentId) {
      const parentCheck = await assertParent(project.id, dto.parentId, issueId)
      if (!parentCheck.ok) return parentCheck
    }

    const result = await IssueRepository.update(issueId, {
      ...dto,
      description: dto.description as Prisma.InputJsonValue | undefined,
      startDate: dto.startDate === undefined ? undefined : startDate,
      dueDate: dto.dueDate === undefined ? undefined : dueDate,
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toIssueDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueResult = await IssueRepository.findById(issueId)
    if (!issueResult.ok) return issueResult
    if (issueResult.value.projectId !== project.id) return err(issueNotFound())

    const result = await IssueRepository.delete(issueId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'delete',
      actorId,
      targetId: issueId,
    })

    return ok(undefined)
  },
}
