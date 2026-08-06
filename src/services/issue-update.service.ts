import { auditMutation } from '@/lib/axiom/audit'
import type { IssueUpdateDTO } from '@/types/issue-update'
import {
  issueForbidden,
  issueNotFound,
  issueUpdateForbidden,
  issueUpdateNotFound,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toIssueUpdateDTO } from '../mappers/issue-update.mapper'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueUpdateRepository } from '../repositories/issue-update.repository'
import type {
  CreateIssueUpdateDTO,
  UpdateIssueUpdateDTO,
} from '../schemas/issue-update.schema'
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

export const IssueUpdateService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueUpdateDTO[]>> {
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

    const result = await IssueUpdateRepository.listByIssue(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toIssueUpdateDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: CreateIssueUpdateDTO,
  ): Promise<Result<IssueUpdateDTO>> {
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

    const result = await IssueUpdateRepository.create({
      status: dto.status,
      content: dto.content,
      issueId,
      authorId: actorId,
    })
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'post_update',
      meta: { status: dto.status },
    })

    return ok(toIssueUpdateDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    updateId: string,
    dto: UpdateIssueUpdateDTO,
  ): Promise<Result<IssueUpdateDTO>> {
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

    const existing = await IssueUpdateRepository.findById(updateId)
    if (!existing.ok) return existing
    if (existing.value.issueId !== issueId) return err(issueUpdateNotFound())
    if (existing.value.authorId !== actorId) return err(issueUpdateForbidden())

    const result = await IssueUpdateRepository.update(updateId, dto)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'edit_update',
      meta: { updateId },
    })

    return ok(toIssueUpdateDTO(result.value))
  },

  async delete(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    updateId: string,
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

    const existing = await IssueUpdateRepository.findById(updateId)
    if (!existing.ok) return existing
    if (existing.value.issueId !== issueId) return err(issueUpdateNotFound())

    const isAuthor = existing.value.authorId === actorId
    if (!isAuthor && !membership.isPrivileged && !isLead) {
      return err(issueUpdateForbidden())
    }

    const result = await IssueUpdateRepository.delete(updateId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'delete_update',
      meta: { updateId },
    })

    return ok(undefined)
  },
}
