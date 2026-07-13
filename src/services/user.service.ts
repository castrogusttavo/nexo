import type { OnboardingStep, UserGoal } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal/versions'
import { UserCache } from '@/src/cache/user.cache'
import { conflict, databaseError, usernameConflict } from '@/src/errors'
import { sendDeleteAccountEmail } from '@/src/lib/mail/user/send-delete-account'
import {
  cancelAccountDeletion,
  getAccountDeletionGraceMs,
  scheduleAccountDeletion,
} from '@/src/lib/queue/account-lifecycle'
import { enqueueUserExport } from '@/src/lib/queue/data-export'
import { consume, exportLimiter } from '@/src/lib/rate-limit'
import { err, ok, type Result } from '@/src/lib/result'
import { toUserDTO } from '@/src/mappers/user.mapper'
import { UserRepository } from '@/src/repositories/user.repository'
import type {
  SaveGoalsDTO,
  SaveProfileDTO,
  SaveRoleDTO,
  UpdateUserDTO,
} from '@/src/schemas/user.schema'
import type { UserDTO } from '@/types/user'

export interface AccountDeletionScheduled {
  scheduledAt: string
}

export interface DataExportRequested {
  requestedAt: string
}

export interface OnboardingProfile {
  name: string
  image: string | null
  twoFactorEnabled: boolean
  hasPassword: boolean
  onboardingStep: OnboardingStep | null
}

const DELETION_DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function formatDeletionDate(date: Date): string {
  return DELETION_DATE_FORMATTER.format(date)
}

const NEXT_STEP: Record<OnboardingStep, OnboardingStep | null> = {
  PROFILE: 'ROLE',
  ROLE: 'BRINGS',
  BRINGS: 'WORKSPACE',
  WORKSPACE: null,
}

const PREV_STEP: Partial<Record<OnboardingStep, OnboardingStep>> = {
  ROLE: 'PROFILE',
  BRINGS: 'ROLE',
  WORKSPACE: 'BRINGS',
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

    if (dto.username) {
      const existingResult = await UserRepository.findByUsername(dto.username)
      if (!existingResult.ok) return existingResult

      if (existingResult.value && existingResult.value.id !== actorId) {
        auditMutation({
          entity: 'user',
          action: 'update',
          actorId,
          targetId: actorId,
          outcome: 'failure',
          reason: 'username_conflict',
          meta: { fields: Object.keys(dto) },
        })
        return err(usernameConflict())
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

  async saveOnboardingRole(
    actorId: string,
    dto: SaveRoleDTO,
  ): Promise<Result<void>> {
    const result = await UserRepository.saveRole(actorId, dto.role, 'BRINGS')
    if (!result.ok) {
      auditMutation({
        entity: 'user',
        action: 'onboarding_role_saved',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'user',
      action: 'onboarding_role_saved',
      actorId,
      targetId: actorId,
      meta: { role: dto.role },
    })

    return ok(undefined)
  },

  async saveOnboardingProfile(
    actorId: string,
    dto: SaveProfileDTO,
  ): Promise<Result<void>> {
    const result = await UserRepository.saveProfile(actorId, dto.name, 'ROLE')
    if (!result.ok) {
      auditMutation({
        entity: 'user',
        action: 'onboarding_profile_saved',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'user',
      action: 'onboarding_profile_saved',
      actorId,
      targetId: actorId,
    })

    return ok(undefined)
  },

  async saveOnboardingGoals(
    actorId: string,
    dto: SaveGoalsDTO,
  ): Promise<Result<void>> {
    const result = await UserRepository.saveGoals(
      actorId,
      dto.goals as UserGoal[],
      'WORKSPACE',
    )
    if (!result.ok) {
      auditMutation({
        entity: 'user',
        action: 'onboarding_goals_saved',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'user',
      action: 'onboarding_goals_saved',
      actorId,
      targetId: actorId,
      meta: { goals: dto.goals },
    })

    return ok(undefined)
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

    const sessionsResult = await UserRepository.deleteAllSessions(actorId)
    if (!sessionsResult.ok) {
      logger.warn('user.delete_account.sessions_cleanup_failed', {
        component: 'UserService',
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
        component: 'UserService',
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

  async completeOnboardingStep(
    actorId: string,
    step: OnboardingStep,
  ): Promise<Result<void>> {
    const result = await UserRepository.updateOnboardingStep(
      actorId,
      NEXT_STEP[step],
    )
    if (!result.ok) return result

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'user',
      action: 'onboarding_step_completed',
      actorId,
      targetId: actorId,
      meta: { step },
    })

    return ok(undefined)
  },

  async goBackOnboardingStep(actorId: string): Promise<Result<void>> {
    const userResult = await UserRepository.findById(actorId)
    if (!userResult.ok) return userResult

    const current = userResult.value.onboardingStep
    const prev = current ? PREV_STEP[current] : undefined
    if (!prev) return ok(undefined)

    const result = await UserRepository.updateOnboardingStep(actorId, prev)
    if (!result.ok) return result

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'user',
      action: 'onboarding_step_reverted',
      actorId,
      targetId: actorId,
      meta: { from: current, to: prev },
    })

    return ok(undefined)
  },

  async getOnboardingProfile(
    actorId: string,
  ): Promise<Result<OnboardingProfile>> {
    const [userResult, hasPassword] = await Promise.all([
      UserRepository.findById(actorId),
      UserRepository.hasCredentialAccount(actorId),
    ])
    if (!userResult.ok) return userResult
    if (!hasPassword.ok) return hasPassword

    const user = userResult.value

    return ok({
      name: user.name,
      image: user.image,
      twoFactorEnabled: user.twoFactorEnabled,
      hasPassword: hasPassword.value,
      onboardingStep: user.onboardingStep,
    })
  },

  async acceptConsents(
    actorId: string,
    context: { ipAddress: string | null; userAgent: string | null },
  ): Promise<Result<void>> {
    const result = await UserRepository.acceptConsents(actorId, {
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      at: new Date(),
    })

    if (!result.ok) {
      logger.error('consent.persist_failed', {
        actorId,
        reason: result.error.code,
      })
      auditMutation({
        entity: 'consent',
        action: 'grant',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: result.error.code,
      })
      return result
    }

    await UserCache.invalidate(actorId)

    auditMutation({
      entity: 'consent',
      action: 'grant',
      actorId,
      targetId: actorId,
      meta: {
        documents: ['TERMS', 'PRIVACY'],
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        source: 'onboarding',
      },
    })

    return ok(undefined)
  },
}
