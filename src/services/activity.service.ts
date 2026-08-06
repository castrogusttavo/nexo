import type { ActivityEntityType, Prisma } from '@prisma/client'
import { logger } from '@/lib/axiom/logger'
import type { ActivityDTO } from '@/types/activity'
import {
  cycleNotFound,
  issueNotFound,
  moduleNotFound,
  projectForbidden,
} from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toActivityDTO } from '../mappers/activity.mapper'
import { ActivityRepository } from '../repositories/activity.repository'
import { CycleRepository } from '../repositories/cycle.repository'
import { IssueRepository } from '../repositories/issue.repository'
import { ModuleRepository } from '../repositories/module.repository'
import { resolveProject } from './_project-scope'

async function assertEntityInProject(
  entityType: ActivityEntityType,
  entityId: string,
  projectId: string,
): Promise<Result<void>> {
  if (entityType === 'ISSUE') {
    const issue = await IssueRepository.findById(entityId)
    if (!issue.ok) return issue
    if (issue.value.projectId !== projectId) return err(issueNotFound())
    return ok(undefined)
  }

  if (entityType === 'CYCLE') {
    const cycle = await CycleRepository.findById(entityId)
    if (!cycle.ok) return cycle
    if (cycle.value.projectId !== projectId) return err(cycleNotFound())
    return ok(undefined)
  }

  const moduleResult = await ModuleRepository.findById(entityId)
  if (!moduleResult.ok) return moduleResult
  if (moduleResult.value.projectId !== projectId) return err(moduleNotFound())
  return ok(undefined)
}

export const ActivityService = {
  async list(
    actorId: string,
    workspaceId: string,
    projectSlug: string,
    entityType: ActivityEntityType,
    entityId: string,
  ): Promise<Result<ActivityDTO[]>> {
    const resolved = await resolveProject(actorId, workspaceId, projectSlug)
    if (!resolved.ok) return err(resolved.error)

    const { membership, project } = resolved
    const isLead = project.leadId === actorId
    const isMember = project.members.some((m) => m.userId === actorId)
    if (!project.isPublic && !membership.isPrivileged && !isLead && !isMember) {
      return err(projectForbidden())
    }

    const entityCheck = await assertEntityInProject(
      entityType,
      entityId,
      project.id,
    )
    if (!entityCheck.ok) return entityCheck

    const result = await ActivityRepository.listByEntity(entityType, entityId)
    if (!result.ok) return result

    return ok(result.value.map(toActivityDTO))
  },

  async record(input: {
    entityType: ActivityEntityType
    entityId: string
    actorId: string
    field: string
    oldValue?: Prisma.InputJsonValue
    newValue?: Prisma.InputJsonValue
  }): Promise<void> {
    const result = await ActivityRepository.record(input)
    if (!result.ok) {
      logger.warn('activity.record_failed', {
        component: 'ActivityService',
        ...input,
        error: result.error.code,
      })
    }
  },
}
