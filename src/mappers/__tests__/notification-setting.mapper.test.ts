import { describe, expect, it } from 'vitest'
import { createFakeNotificationSetting } from '@/src/__tests__/factories/notification-setting.factory'
import { toNotificationSettingDTO } from '@/src/mappers/notification-setting.mapper'

describe('toNotificationSettingDTO', () => {
  it('should map only the exposed boolean fields', () => {
    const setting = createFakeNotificationSetting({
      priorityChanges: false,
      stateChanges: true,
      comments: false,
      mentions: true,
    })

    const dto = toNotificationSettingDTO(setting)

    expect(dto).toEqual({
      priorityChanges: false,
      stateChanges: true,
      comments: false,
      mentions: true,
    })
  })

  it('should not leak internal fields (id, userId, timestamps)', () => {
    const dto = toNotificationSettingDTO(createFakeNotificationSetting())

    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('userId')
    expect(dto).not.toHaveProperty('createdAt')
    expect(dto).not.toHaveProperty('updatedAt')
  })
})
