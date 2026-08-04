import { auditMutation } from '@/lib/axiom/audit'
import type { IssueRelationDTO } from '@/types/issue'
import {
  issueForbidden,
  issueNotFound,
  issueRelationAlreadyExists,
  issueRelationSelf,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toIssueRelationDTO } from '../mappers/issue.mapper'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueRelationRepository } from '../repositories/issue-relation.repository'
import type { CreateIssueRelationDTO } from '../schemas/issue-relation.schema'
import { resolveProject } from './_project-scope'

async function assertIssueInProject(
  issueId: string,
  projectId: string,
): Promise<Result<void>> {
  const issueResult = await IssueRepository.findById(issueId)
  if (!issueResult.ok) return issueResult
  if (issueResult.value.projectId !== projectId) return err(issueNotFound())
  return ok(undefined)
}

export const IssueRelationService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueRelationDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const result = await IssueRelationRepository.listByIssue(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toIssueRelationDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: CreateIssueRelationDTO,
  ): Promise<Result<IssueRelationDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    if (dto.targetId === issueId) return err(issueRelationSelf())

    const sourceCheck = await assertIssueInProject(issueId, project.id)
    if (!sourceCheck.ok) return sourceCheck

    const targetCheck = await assertIssueInProject(dto.targetId, project.id)
    if (!targetCheck.ok) return targetCheck

    const existing = await IssueRelationRepository.findBetween(
      issueId,
      dto.targetId,
      dto.type,
    )
    if (!existing.ok) return existing
    if (existing.value) return err(issueRelationAlreadyExists())

    const result = await IssueRelationRepository.create(
      issueId,
      dto.targetId,
      dto.type,
    )
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'add_reltion',
      meta: { targetId: dto.targetId, type: dto.type },
    })

    return ok(toIssueRelationDTO(result.value))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    relationId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const relation = await IssueRelationRepository.findById(relationId)
    if (!relation.ok) return relation
    if (
      relation.value.sourceId !== issueId &&
      relation.value.targetId !== issueId
    ) {
      return err(issueNotFound())
    }

    const result = await IssueRelationRepository.remove(relationId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'remove_relation',
      meta: { relationId },
    })

    return ok(undefined)
  },
}
