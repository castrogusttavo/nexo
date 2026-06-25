import { describe, expect, it } from 'vitest'
import { UpdateUserPreferenceSchema } from '@/src/schemas/user-preference.schema'

describe('UpdateUserPreferenceSchema', () => {
  it('should accept a full valid payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      theme: 'DARK',
      smoothCursor: true,
      quickSendShortcut: 'CTRL_ENTER',
      timezone: 'America/Sao_Paulo',
      weekStartsOn: 0,
      weekendDays: [5, 6],
    })

    expect(result.success).toBe(true)
  })

  it('should accept a partial payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ theme: 'LIGHT' })

    expect(result.success).toBe(true)
  })

  it('should reject an empty payload', () => {
    const result = UpdateUserPreferenceSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('should reject an unknown theme', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ theme: 'NEON' })

    expect(result.success).toBe(false)
  })

  it('should reject an unknown quick-send shortcut', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      quickSendShortcut: 'CTRL_END',
    })

    expect(result.success).toBe(false)
  })

  it('should reject an invalid timezone', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      timezone: 'Not/AZone',
    })

    expect(result.success).toBe(false)
  })

  it('should accept a valid IANA timezone', () => {
    const result = UpdateUserPreferenceSchema.safeParse({
      timezone: 'Europe/Lisbon',
    })

    expect(result.success).toBe(true)
  })

  it('should reject weekStartsOn out of range', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekStartsOn: 7 })

    expect(result.success).toBe(false)
  })

  it('should reject a non-integer weekStartsOn', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekStartsOn: 1.5 })

    expect(result.success).toBe(false)
  })

  it('should reject weekendDays with an out-of-range day', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [7] })

    expect(result.success).toBe(false)
  })

  it('should reject duplicate weekendDays', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [6, 6] })

    expect(result.success).toBe(false)
  })

  it('should accept an empty weekendDays array', () => {
    const result = UpdateUserPreferenceSchema.safeParse({ weekendDays: [] })

    expect(result.success).toBe(true)
  })
})
