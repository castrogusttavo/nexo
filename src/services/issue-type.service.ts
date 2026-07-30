import { auditMutation } from '@/lib/axiom/audit'
import type { IssueTypeDTO } from '@/types/issue-type'
import {
  issueTypeForbidden,
  issueTypeNotFound,
  issueTypeSystemProtected,
  projectForbidden,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toIssueTypeDTO } from '../mappers/issue-type.mapper'
import { IssueTypeRepository } from '../repositories/issue-type.repository'
import type {
  CreateIssueTypeDTO,
  ReorderIssueTypesDTO,
  UpdateIssueTypeDTO,
} from '../schemas/issue-type.schema'
import { resolveProject } from './_project-scope'

export const IssueTypeService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
  ): Promise<Result<IssueTypeDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)

    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const result = await IssueTypeRepository.listByProject(project.id)
    if (!result.ok) return result

    return ok(result.value.map(toIssueTypeDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: CreateIssueTypeDTO,
  ): Promise<Result<IssueTypeDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(issueTypeForbidden())
    }

    const result = await IssueTypeRepository.create({
      ...dto,
      projectId: project.id,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'issue_type',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    auditMutation({
      entity: 'issue_type',
      action: 'create',
      actorId,
      targetId: result.value.id,
    })

    return ok(toIssueTypeDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    typeId: string,
    dto: UpdateIssueTypeDTO,
  ): Promise<Result<IssueTypeDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(issueTypeForbidden())
    }

    const typeResult = await IssueTypeRepository.findById(typeId)
    if (!typeResult.ok) return typeResult
    if (typeResult.value.projectId !== project.id)
      return err(issueTypeNotFound())
    if (typeResult.value.isSystem) return err(issueTypeSystemProtected())

    const result = await IssueTypeRepository.update(typeId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue_type',
      action: 'update',
      actorId,
      targetId: typeId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(toIssueTypeDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    typeId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(issueTypeForbidden())
    }

    const typeResult = await IssueTypeRepository.findById(typeId)
    if (!typeResult.ok) return typeResult
    if (typeResult.value.projectId !== project.id)
      return err(issueTypeNotFound())
    if (typeResult.value.isSystem) return err(issueTypeSystemProtected())

    const result = await IssueTypeRepository.delete(typeId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue_type',
      action: 'delete',
      actorId,
      targetId: typeId,
    })

    return ok(undefined)
  },

  async reorder(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    dto: ReorderIssueTypesDTO,
  ): Promise<Result<IssueTypeDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    if (!membership.isPrivileged && !isLead) {
      return err(issueTypeForbidden())
    }

    const result = await IssueTypeRepository.reorder(project.id, dto.typeIds)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue_type',
      action: 'update',
      actorId,
      reason: 'reorder',
    })

    return ok(result.value.map(toIssueTypeDTO))
  },
}
