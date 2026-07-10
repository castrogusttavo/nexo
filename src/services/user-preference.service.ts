import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import type { UserPreferenceDTO } from '@/types/user-preference'
import { UserPreferenceCache } from '../cache/user-preference.cache'
import { ok, type Result } from '../lib/result'
import { toUserPreferenceDTO } from '../mappers/user-preference.mapper'
import { UserPreferenceRepository } from '../repositories/user-preference.repository'
import type { UpdateUserPreferenceDTO } from '../schemas/user-preference.schema'

export const UserPreferenceService = {
  async get(actorId: string): Promise<Result<UserPreferenceDTO>> {
    const cached = await UserPreferenceCache.get(actorId)
    if (cached) return ok(cached)

    const found = await UserPreferenceRepository.findByUserId(actorId)

    // Lazy creation: first read materializes the row with default.
    if (!found.ok) {
      if (found.error.code !== 'RESOURCE_NOT_FOUND') return found

      const created = await UserPreferenceRepository.upsert(actorId)
      if (!created.ok) return created

      const dto = toUserPreferenceDTO(created.value)
      await UserPreferenceCache.set(actorId, dto)
      return ok(dto)
    }

    const dto = toUserPreferenceDTO(found.value)
    await UserPreferenceCache.set(actorId, dto)
    return ok(dto)
  },

  async update(
    actorId: string,
    dto: UpdateUserPreferenceDTO,
  ): Promise<Result<UserPreferenceDTO>> {
    const result = await UserPreferenceRepository.upsert(actorId, dto)

    if (!result.ok) {
      auditMutation({
        entity: 'user_preference',
        action: 'update',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: 'database_error',
        meta: { fields: Object.keys(dto) },
      })
      return result
    }

    await UserPreferenceCache.invalidate(actorId)

    auditMutation({
      entity: 'user_preference',
      action: 'update',
      actorId,
      targetId: actorId,
      outcome: 'success',
      meta: { fields: Object.keys(dto) },
    })

    logger.info('user_preference.updated', {
      component: 'UserPreferenceService',
      actorId,
      fields: Object.keys(dto),
    })

    return ok(toUserPreferenceDTO(result.value))
  },
}
