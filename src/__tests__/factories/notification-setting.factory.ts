import type { NotificationSetting, Prisma } from '@prisma/client'
import type { NotificationSettingDTO } from '@/types/notification-setting'

export function createFakeNotificationSetting(
  overrides: Partial<NotificationSetting> = {},
): NotificationSetting {
  const now = new Date('2026-06-24T12:00:00.000Z')
  return {
    id: 'notif_123',
    userId: 'user_123',
    priorityChanges: true,
    stateChanges: true,
    comments: true,
    mentions: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeNotificationSettingDTO(
  overrides: Partial<NotificationSetting> = {},
): NotificationSettingDTO {
  return {
    priorityChanges: true,
    stateChanges: true,
    comments: true,
    mentions: true,
    ...overrides,
  }
}

export function fakeNotificationSettingInput(
  overriides: Partial<Prisma.NotificationSettingUncheckedCreateInput> = {},
): Prisma.NotificationSettingUncheckedCreateInput {
  return { userId: 'user_123', ...overriides }
}
