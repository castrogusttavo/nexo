import { describe, expect, it } from 'vitest'
import { UpdateNotificationSettingSchema } from '@/src/schemas/notification-settings.schema'

describe('UpdateNotificationSettingSchema', () => {
  it('should accept a full valid payload', () => {
    const result = UpdateNotificationSettingSchema.safeParse({
      priorityChanges: false,
      stateChanges: false,
      comments: false,
      mentions: false,
    })

    expect(result.success).toBe(true)
  })

  it('should accept a partial payload', () => {
    const result = UpdateNotificationSettingSchema.safeParse({
      comments: false,
    })

    expect(result.success).toBe(true)
  })

  it('should reject an empty payload', () => {
    const result = UpdateNotificationSettingSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('should reject a non-boolean value', () => {
    const result = UpdateNotificationSettingSchema.safeParse({
      mentions: 'yes',
    })

    expect(result.success).toBe(false)
  })
})
