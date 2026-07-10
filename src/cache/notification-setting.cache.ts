import type { NotificationSettingDTO } from '@/types/notification-setting'
import { createKeyedCache } from './_cache'

export const NotificationSettingCache =
  createKeyedCache<NotificationSettingDTO>({
    prefix: 'notif:',
    ttl: 15 * 60,
    name: 'notification_settings',
  })
