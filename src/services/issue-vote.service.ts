import { auditMutation } from '@/lib/axiom/audit'
import type { IssueVoteSummaryDTO } from '@/types/issue'
import { issueForbidden, issueNotFound } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueVoteRepository } from '../repositories/issue-vote.repository'
import type { CastIssueVoteDTO } from '../schemas/issue-vote.schema'
import { resolveProject } from './_project-scope'

async function assertInProject(
  issueId: string,
  projectId: string,
): Promise<Result<void>> {
  const issueResult = await IssueRepository.findById(issueId)
  if (!issueResult.ok) return issueResult
  if (issueResult.value.projectId !== projectId) return err(issueNotFound())
  return ok(undefined)
}

async function buildSummary(
  issueId: string,
  actorId: string,
): Promise<Result<IssueVoteSummaryDTO>> {
  const tally = await IssueVoteRepository.tallyByIssue(issueId)
  if (!tally.ok) return tally

  const own = await IssueVoteRepository.findByIssueAndUser(issueId, actorId)
  if (!own.ok) return own

  return ok({
    up: tally.value.up,
    down: tally.value.down,
    myVote: own.value?.type ?? null,
  })
}

export const IssueVoteService = {
  async summary(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueVoteSummaryDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    return buildSummary(issueId, actorId)
  },

  async cast(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: CastIssueVoteDTO,
  ): Promise<Result<IssueVoteSummaryDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const result = await IssueVoteRepository.upsert(issueId, actorId, dto.type)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'cast_vote',
      meta: { type: dto.type },
    })

    return buildSummary(issueId, actorId)
  },

  async retract(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueVoteSummaryDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const issueCheck = await assertInProject(issueId, project.id)
    if (!issueCheck.ok) return issueCheck

    const result = await IssueVoteRepository.delete(issueId, actorId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'retract_vote',
    })

    return buildSummary(issueId, actorId)
  },
}
