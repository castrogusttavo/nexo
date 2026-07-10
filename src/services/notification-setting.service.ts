import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import type { NotificationSettingDTO } from '@/types/notification-setting'
import { NotificationSettingCache } from '../cache/notification-setting.cache'
import { ok, type Result } from '../lib/result'
import { toNotificationSettingDTO } from '../mappers/notification-setting.mapper'
import { NotificationSettingRepository } from '../repositories/notification-setting.repository'
import type { UpdateNotificationSettingDTO } from '../schemas/notification-settings.schema'

export const NotificationSettingService = {
  async get(actorId: string): Promise<Result<NotificationSettingDTO>> {
    const cached = await NotificationSettingCache.get(actorId)
    if (cached) return ok(cached)

    const found = await NotificationSettingRepository.findByUserId(actorId)

    // Lazy creation: first read materializes the row with defaults
    if (!found.ok) {
      if (found.error.code !== 'RESOURCE_NOT_FOUND') return found

      const created = await NotificationSettingRepository.upsert(actorId)
      if (!created.ok) return created

      const dto = toNotificationSettingDTO(created.value)
      await NotificationSettingCache.set(actorId, dto)
      return ok(dto)
    }

    const dto = toNotificationSettingDTO(found.value)
    await NotificationSettingCache.set(actorId, dto)
    return ok(dto)
  },

  async update(
    actorId: string,
    dto: UpdateNotificationSettingDTO,
  ): Promise<Result<NotificationSettingDTO>> {
    const result = await NotificationSettingRepository.upsert(actorId, dto)

    if (!result.ok) {
      auditMutation({
        entity: 'notification_setting',
        action: 'update',
        actorId,
        targetId: actorId,
        outcome: 'failure',
        reason: 'database_error',
        meta: { fields: Object.keys(dto) },
      })
      return result
    }

    await NotificationSettingCache.invalidate(actorId)

    auditMutation({
      entity: 'notification_setting',
      action: 'update',
      actorId,
      outcome: 'success',
      meta: { fields: Object.keys(dto) },
    })

    logger.info('notification_setting.updated', {
      component: 'NotificationSettingService',
      actorId,
      fields: Object.keys(dto),
    })

    return ok(toNotificationSettingDTO(result.value))
  },
}
