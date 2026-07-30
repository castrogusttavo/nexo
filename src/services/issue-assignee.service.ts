import { auditMutation } from '@/lib/axiom/audit'
import { issueForbidden, issueNotFound, projectMemberNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { IssueRepository } from '../repositories/issue.repository'
import {
  IssueAssigneeRepository,
  type IssueAssigneeWithUser,
  IssueSubscriberRepository,
} from '../repositories/issue-assignee.repository'
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

export const IssueAssigneeService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueAssigneeWithUser[]>> {
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

    return IssueAssigneeRepository.list(issueId)
  },

  async assign(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    userId: string,
  ): Promise<Result<IssueAssigneeWithUser>> {
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

    const targetIsMember = project.members.some((m) => m.userId === userId)
    if (!targetIsMember) return err(projectMemberNotFound())

    const result = await IssueAssigneeRepository.assign(issueId, userId)
    if (!result.ok) return result

    await IssueSubscriberRepository.subscribe(issueId, userId)

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'assign',
      meta: { userId },
    })

    return ok(result.value)
  },

  async unassign(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    userId: string,
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

    const result = await IssueAssigneeRepository.unassign(issueId, userId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'unassign',
      meta: { userId },
    })

    return ok(undefined)
  },

  async subscribe(
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

    const issueCheck = await assertIssueInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const result = await IssueSubscriberRepository.subscribe(issueId, actorId)
    if (!result.ok) return result

    return ok(undefined)
  },

  async unsubscribe(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ) {
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

    const result = await IssueSubscriberRepository.unsubscribe(issueId, actorId)
    if (!result.ok) return result

    return ok(undefined)
  },
}
