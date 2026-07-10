import type { NotificationSetting } from '@prisma/client'
import type { NotificationSettingDTO } from '@/types/notification-setting'

export function toNotificationSettingDTO(
  s: NotificationSetting,
): NotificationSettingDTO {
  return {
    priorityChanges: s.priorityChanges,
    stateChanges: s.stateChanges,
    comments: s.comments,
    mentions: s.mentions,
  }
}
