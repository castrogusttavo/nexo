import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { UserCache } from '@/src/cache/user.cache'
import { conflict, databaseError } from '@/src/errors'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import {
  cancelAccountDeletion,
  getAccountDeletionGraceMs,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { enqueueUserExport } from '@/src/lib/queue/data-export'
import { consume, exportLimiter } from '@/src/lib/rate-limit'
import { err, ok, type Result } from '@/src/lib/result'
import { UserRepository } from '@/src/repositories/user.repository'

export interface AccountDeletionScheduled {
  scheduledAt: string
}

export interface DataExportRequested {
  requestedAt: string
}

const DELETION_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function formatDeletionDate(date: Date): string {
  return DELETION_DATE_FORMATTER.format(date)
}

export const AccountLifecycleService = {
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
        component: 'AccountLifecycleService',
        userId: actorId,
        message,
      })
      await UserRepository.clearDeletionSchedule(actorId)
      return err(databaseError('Failed to enqueue account deletion'))
    }

    const sessionsResult = await UserRepository.deleteAllSessions(actorId)
    if (!sessionsResult.ok) {
      logger.warn('user.delete_account.sessions_cleanup_failed', {
        component: 'AccountLifecycleService',
        userId: actorId,
        reason: sessionsResult.error.code,
      })
    }

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
        component: 'AccountLifecycleService',
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

  async requestExport(actorId: string): Promise<Result<DataExportRequested>> {
    const userResult = await UserRepository.findById(actorId)
    if (!userResult.ok) return userResult

    const guard = await consume(exportLimiter, actorId)
    if (!guard.ok) {
      auditMutation({
        entity: 'user',
        action: 'export_requested',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: guard.error.code,
      })
      return err(guard.error)
    }

    try {
      await enqueueUserExport(actorId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error('user.export.enqueue_failed', {
        component: 'AccountLifecycleService',
        userId: actorId,
        message,
      })
      auditMutation({
        entity: 'user',
        action: 'export_requested',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: 'enqueue_failed',
      })
      return err(databaseError('Failed to enqueue data export'))
    }

    const requestedAt = new Date().toISOString()

    auditMutation({
      entity: 'user',
      action: 'export_requested',
      actorId,
      targetId: actorId,
      meta: { requestedAt },
    })

    return ok({ requestedAt })
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
