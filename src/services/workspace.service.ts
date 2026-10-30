import type { Plan } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { forbidden, workspaceHasActivePlan } from '@/src/errors'
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
import { assertMember } from './_authz'
import { dropObject } from './media/_media'
import { WORKSPACE_LOGO_BUCKET } from './media/workspace-media.service'

export const WorkspaceService = {
  async getById(
    actorId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceDTO>> {
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

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
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

    if (!membership.value.isPrivileged) {
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

    const memberIds =
      await MembershipRepository.listUserIdsByWorkspace(workspaceId)
    await Promise.all(
      (memberIds.ok ? memberIds.value : [actorId]).map((id) =>
        UserCache.invalidate(id),
      ),
    )

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
    const membership = await assertMember(actorId, workspaceId)
    if (!membership.ok) return membership

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

    // A paid plan or a trial still has a subscription behind it; it has to be
    // cancelled first so a delete never leaves billing running for a
    // workspace that no longer exists.
    const current = await WorkspaceRepository.findById(workspaceId)
    if (!current.ok) return current

    if (current.value.activePlan !== 'FREE') {
      auditMutation({
        entity: 'workspace',
        action: 'delete',
        actorId,
        targetId: workspaceId,
        outcome: 'failure',
        reason: 'active_plan',
        meta: { plan: current.value.activePlan },
      })
      return err(workspaceHasActivePlan())
    }

    // Must be read before the delete: memberships are removed in cascade
    // along with the workspace.
    const memberIds =
      await MembershipRepository.listUserIdsByWorkspace(workspaceId)
    // Same reason: the row (and its image URL) is gone after the delete.
    const logo = current.value.image

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

    await dropObject(WORKSPACE_LOGO_BUCKET, logo)
    await WorkspaceCache.invalidate(workspaceId)
    await Promise.all(
      (memberIds.ok ? memberIds.value : [actorId]).map((id) =>
        UserCache.invalidate(id),
      ),
    )

    auditMutation({
      entity: 'workspace',
      action: 'delete',
      actorId,
      targetId: workspaceId,
    })

    return ok(undefined)
  },
}
