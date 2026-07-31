import { auditMutation } from '@/lib/axiom/audit'
import type { IssueLabelDTO } from '@/types/issue'
import { issueForbidden, issueNotFound, labelNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toIssueLabelDTO } from '../mappers/issue.mapper'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueLabelRepository } from '../repositories/issue-label.repository'
import { LabelRepository } from '../repositories/label.repository'
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

export const IssueLabelService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueLabelDTO[]>> {
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

    const result = await IssueLabelRepository.list(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toIssueLabelDTO))
  },

  async add(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    labelId: string,
  ): Promise<Result<IssueLabelDTO>> {
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

    const labelResult = await LabelRepository.findById(labelId)
    if (!labelResult.ok) return labelResult
    if (labelResult.value.projectId !== project.id) return err(labelNotFound())

    const result = await IssueLabelRepository.add(issueId, labelId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'add_label',
      meta: { labelId },
    })

    return ok(toIssueLabelDTO(result.value))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    labelId: string,
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

    const result = await IssueLabelRepository.remove(issueId, labelId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'remove_label',
      meta: { labelId },
    })

    return ok(undefined)
  },
}
