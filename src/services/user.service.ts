import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { UserCache } from '@/src/cache/user.cache'
import { conflict, databaseError } from '@/src/errors'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import { prisma } from '@/src/lib/prisma'
import {
  cancelAccountDeletion,
  getAccountDeletionGraceMs,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { err, ok, type Result } from '@/src/lib/result'
import { toUserDTO } from '@/src/mappers/user.mapper'
import { UserRepository } from '@/src/repositories/user.repository'
import type { UpdateUserDTO } from '@/src/schemas/user.schema'
import type { UserDTO } from '@/types/user'

export interface AccountDeletionScheduled {
  scheduledAt: string
}

function formatDeletionDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const UserService = {
  async getProfile(actorId: string): Promise<Result<UserDTO>> {
    const cached = await UserCache.get(actorId)
    if (cached) return ok(cached)

    const result = await UserRepository.findByIdWithMemberships(actorId)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.set(actorId, userDTO)

    return ok(userDTO)
  },

  async updateProfile(
    actorId: string,
    dto: UpdateUserDTO,
  ): Promise<Result<UserDTO>> {
    if (dto.email) {
      const existingResult = await UserRepository.findByEmail(dto.email)
      if (!existingResult.ok) return existingResult

      if (existingResult.value && existingResult.value.id !== actorId) {
        auditMutation({
          entity: 'user',
          action: 'update',
          actorId,
          targetId: actorId,
          outcome: 'failure',
          reason: 'email_conflict',
          meta: { fields: Object.keys(dto) },
        })
        return err(conflict('E-mail já está em uso'))
      }
    }

    const updateResult = await UserRepository.update(actorId, dto)
    if (!updateResult.ok) {
      auditMutation({
        entity: 'user',
        action: 'update',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: updateResult.error.code,
        meta: { fields: Object.keys(dto) },
      })
      return updateResult
    }

    await UserCache.invalidate(actorId)

    const result = await UserRepository.findByIdWithMemberships(actorId)
    if (!result.ok) return result

    const userDTO = toUserDTO(result.value)
    await UserCache.set(actorId, userDTO)

    auditMutation({
      entity: 'user',
      action: 'update',
      actorId,
      targetId: actorId,
      meta: { fields: Object.keys(dto) },
    })

    return ok(userDTO)
  },

  async deleteAccount(
    actorId: string,
  ): Promise<Result<AccountDeletionScheduled>> {
    const userResult = await UserRepository.findById(actorId)
    if (!userResult.ok) return userResult

    const user = userResult.value

    if (user.deletionScheduledAt) {
      return ok({ scheduledAt: user.deletionScheduledAt.toISOString() })
    }

    const blockingResult =
      await UserRepository.countBlockingSoleOwnerWorkspaces(actorId)
    if (!blockingResult.ok) return blockingResult

    if (blockingResult.value > 0) {
      auditMutation({
        entity: 'user',
        action: 'delete',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: 'sole_owner_workspace',
        meta: { blockingWorkspaces: blockingResult.value },
      })
      return err(
        conflict(
          'Transfira a posse dos workspaces onde você é único OWNER antes de excluir a conta',
        ),
      )
    }

    const scheduledAt = new Date(Date.now() + getAccountDeletionGraceMs())

    const scheduleResult = await UserRepository.scheduleDeletion(
      actorId,
      scheduledAt,
    )
    if (!scheduleResult.ok) return scheduleResult

    try {
      await scheduleAccountDeletion(actorId, scheduledAt)
    } catch (error) {
      // Queue enqueue failed: revert the DB so the user isn't left
      // marked-for-deletion without a job to actually process it.
      const message = error instanceof Error ? error.message : String(error)
      logger.error('user.delete_account.enqueue_failed', {
        component: 'UserService',
        userId: actorId,
        message,
      })
      await UserRepository.clearDeletionSchedule(actorId)
      return err(databaseError('Failed to enqueue account deletion'))
    }

    await prisma.session.deleteMany({ where: { userId: actorId } })

    await UserCache.invalidate(actorId)

    try {
      await sendDeleteAccountEmail({
        email: user.email,
        username: user.name,
        scheduledDeletionDate: formatDeletionDate(scheduledAt),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('user.delete_account.email_failed', {
        component: 'UserService',
        userId: actorId,
        message,
      })
    }

    auditMutation({
      entity: 'user',
      action: 'delete',
      actorId,
      targetId: actorId,
      meta: { scheduledAt: scheduledAt.toISOString() },
    })

    return ok({ scheduledAt: scheduledAt.toISOString() })
  },

  async cancelDeletion(userId: string): Promise<Result<{ canceled: boolean }>> {
    const userResult = await UserRepository.findById(userId)
    if (!userResult.ok) return userResult

    if (!userResult.value.deletionScheduledAt) {
      return ok({ canceled: false })
    }

    await cancelAccountDeletion(userId)

    const clearResult = await UserRepository.clearDeletionSchedule(userId)
    if (!clearResult.ok) return clearResult

    await UserCache.invalidate(userId)

    auditMutation({
      entity: 'user',
      action: 'cancel',
      actorId: userId,
      targetId: userId,
    })

    return ok({ canceled: true })
  },
}
