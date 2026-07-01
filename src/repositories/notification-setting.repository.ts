import type { NotificationSetting } from '@prisma/client'
import { databaseError, notFound } from '../errors'
import { prisma } from '../lib/prisma'
import { err, ok, type Result } from '../lib/result'
import type { UpdateNotificationSettingDTO } from '../schemas/notification-settings.schema'

export const NotificationSettingRepository = {
  async findByUserId(userId: string): Promise<Result<NotificationSetting>> {
    try {
      const setting = await prisma.notificationSetting.findUnique({
        where: { userId },
      })

      if (!setting) {
        return err(notFound('NotificationSetting'))
      }

      return ok(setting)
    } catch {
      return err(databaseError('Failed to find notification setting'))
    }
  },

  async upsert(
    userId: string,
    data: UpdateNotificationSettingDTO = {},
  ): Promise<Result<NotificationSetting>> {
    try {
      const setting = await prisma.notificationSetting.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      })

      return ok(setting)
    } catch {
      return err(databaseError('Failed to upsert notification setting'))
    }
  },
}
