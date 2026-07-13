import type { OnboardingStep, UserGoal } from '@prisma/client'
import { auditMutation } from '@/lib/axiom/audit'
import { UserCache } from '@/src/cache/user.cache'
import { ok, type Result } from '@/src/lib/result'
import { UserRepository } from '@/src/repositories/user.repository'
import type {
  SaveGoalsDTO,
  SaveProfileDTO,
  SaveRoleDTO,
} from '@/src/schemas/user.schema'

export interface OnboardingProfile {
  name: string
  image: string | null
  twoFactorEnabled: boolean
  hasPassword: boolean
  onboardingStep: OnboardingStep | null
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

export const OnboardingService = {
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
}
