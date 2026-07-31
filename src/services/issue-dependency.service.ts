import type { IssueDependencyType } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import type { IssueDependencyDTO } from '@/types/issue'
import { issueNotFound } from '../errors'
import { issueDependencyCycle, issueForbidden } from '../errors/app-error'
import { err, ok, type Result } from '../lib/result'
import { toIssueDependencyDTO } from '../mappers/issue.mapper'
import { IssueRepository } from '../repositories/issue.repository'
import { IssueDependencyRepository } from '../repositories/issue-dependency.repository'
import type { CreateIssueDependencyDTO } from '../schemas/issue-dependency.schema'
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

async function assertNoDependencyCycle(
  sourceId: string,
  targetId: string,
  type: IssueDependencyType,
): Promise<Result<void>> {
  const seen = new Set<string>()
  const queue: string[] = [targetId]

  while (queue.length > 0) {
    const currentId = queue.shift() as string
    if (currentId === sourceId) return err(issueDependencyCycle())
    if (seen.has(currentId)) continue
    seen.add(currentId)

    const outgoing = await IssueDependencyRepository.listOutgoing(
      currentId,
      type,
    )
    if (!outgoing.ok) return outgoing
    queue.push(...outgoing.value.map((d) => d.targetId))
  }

  return ok(undefined)
}

export const IssueDependencyService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
  ): Promise<Result<IssueDependencyDTO[]>> {
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

    const result = await IssueDependencyRepository.listByIssue(issueId)
    if (!result.ok) return result

    return ok(result.value.map(toIssueDependencyDTO))
  },

  async create(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dto: CreateIssueDependencyDTO,
  ): Promise<Result<IssueDependencyDTO>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const sourceCheck = await assertIssueInProject(issueId, project.id)
    if (!sourceCheck.ok) return sourceCheck

    const targetCheck = await assertIssueInProject(dto.targetId, project.id)
    if (!targetCheck.ok) return targetCheck

    const cycleCheck = await assertNoDependencyCycle(
      issueId,
      dto.targetId,
      dto.type,
    )
    if (!cycleCheck.ok) return cycleCheck

    const result = await IssueDependencyRepository.create(
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
      reason: 'add_dependency',
      meta: { targetId: dto.targetId, type: dto.type },
    })

    return ok(toIssueDependencyDTO(result.value))
  },

  async remove(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    issueId: string,
    dependencyId: string,
  ): Promise<Result<void>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!membership.isPrivileged && !isLead && !isMember) {
      return err(issueForbidden())
    }

    const sourceCheck = await assertIssueInProject(issueId, project.id)
    if (!sourceCheck.ok) return sourceCheck

    const dependency = await IssueDependencyRepository.findById(dependencyId)
    if (!dependency.ok) return dependency
    if (
      dependency.value.sourceId !== issueId &&
      dependency.value.targetId !== issueId
    ) {
      return err(issueNotFound())
    }

    const result = await IssueDependencyRepository.remove(dependencyId)
    if (!result.ok) return result

    auditMutation({
      entity: 'issue',
      action: 'update',
      actorId,
      targetId: issueId,
      reason: 'remove_dependency',
      meta: { dependencyId },
    })

    return ok(undefined)
  },
}
