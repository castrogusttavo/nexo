import type { Plan } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toWorkspaceDTO } from '@/src/mappers/workspace.mapper'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { WorkspaceRepository } from '@/src/repositories/workspace.repository'
import type {
  CreateWorkspaceDTO,
  UpdateWorkspaceDTO,
} from '@/src/schemas/workspace.schema'
import type { WorkspaceDTO } from '@/types/workspace'
import { TRIAL_PLAN, trialEndsAtFrom } from '../config/trial'

export const WorkspaceService = {
  async getById(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceDTO>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      actorId,
      workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) return err(forbidden())

    const cached = await WorkspaceCache.get(workspaceId)
    if (cached) return ok(cached)

    const result = await WorkspaceRepository.findById(workspaceId)
    if (!result.ok) return result

    const dto = toWorkspaceDTO(result.value)
    await WorkspaceCache.set(workspaceId, dto)

    return ok(dto)
  },

  async create(
    actorId: string,
    dto: CreateWorkspaceDTO,
  ): Promise<Result<WorkspaceDTO>> {
    const result = await WorkspaceRepository.createWithOwner(
      {
        ...dto,
        activePlan: TRIAL_PLAN as Plan,
        trialEndsAt: trialEndsAtFrom(),
      },
      actorId,
    )
    if (!result.ok) {
      auditMutation({
        entity: 'workspace',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'workspace',
      action: 'create',
      actorId,
      targetId: result.value.id,
      meta: { trialPlan: TRIAL_PLAN },
    })

    return ok(toWorkspaceDTO(result.value))
  },

  async update(
    actorId: string,
    workspaceId: string,
    dto: UpdateWorkspaceDTO,
  ): Promise<Result<WorkspaceDTO>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      actorId,
      workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) {
      auditMutation({
        entity: 'workspace',
        action: 'update',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: 'not_a_member',
      })
      return err(forbidden())
    }

    if (!['OWNER', 'ADMIN'].includes(membership.value.role)) {
      auditMutation({
        entity: 'workspace',
        action: 'update',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: 'insufficient_role',
        meta: { role: membership.value.role },
      })
      return err(forbidden('Apenas OWNER ou ADMIN podem editar o workspace'))
    }

    const result = await WorkspaceRepository.update(workspaceId, dto)
    if (!result.ok) {
      auditMutation({
        entity: 'workspace',
        action: 'update',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    const workspaceDTO = toWorkspaceDTO(result.value)
    await WorkspaceCache.invalidate(workspaceId)
    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'workspace',
      action: 'update',
      actorId,
      targetId: workspaceId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(workspaceDTO)
  },

  async delete(actorId: string, workspaceId: string): Promise<Result<void>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      actorId,
      workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) {
      auditMutation({
        entity: 'workspace',
        action: 'delete',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: 'not_a_member',
      })
      return err(forbidden())
    }

    if (membership.value.role !== 'OWNER') {
      auditMutation({
        entity: 'workspace',
        action: 'delete',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: 'insufficient_role',
        meta: { role: membership.value.role },
      })
      return err(forbidden('Apenas o OWNER pode deletar o workspace'))
    }

    const result = await WorkspaceRepository.delete(workspaceId)
    if (!result.ok) {
      auditMutation({
        entity: 'workspace',
        action: 'delete',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await WorkspaceCache.invalidate(workspaceId)
    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'workspace',
      action: 'delete',
      actorId,
      targetId: workspaceId,
    })

    return ok(undefined)
  },
}
