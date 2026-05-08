import { describe, expect, it } from 'vitest'
import { StatusHistoryQuerySchema } from '@/src/schemas/status.schema'

describe('StatusHistoryQuerySchema', () => {
  it('should accept a known component key with default days', () => {
    const result = StatusHistoryQuerySchema.safeParse({ componentKey: 'app' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.componentKey).toBe('app')
      expect(result.data.days).toBe(90)
    }
  })

  it('should coerce numeric string for days', () => {
    const result = StatusHistoryQuerySchema.safeParse({
      componentKey: 'database',
      days: '30',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.days).toBe(30)
  })

  it('should reject unknown component key', () => {
    const result = StatusHistoryQuerySchema.safeParse({
      componentKey: 'mystery',
    })

    expect(result.success).toBe(false)
  })

  it('should reject days below 1', () => {
    const result = StatusHistoryQuerySchema.safeParse({
      componentKey: 'app',
      days: 0,
    })

    expect(result.success).toBe(false)
  })

  it('should reject days above 365', () => {
    const result = StatusHistoryQuerySchema.safeParse({
      componentKey: 'app',
      days: 400,
    })

    expect(result.success).toBe(false)
  })

  it('should reject non-integer days', () => {
    const result = StatusHistoryQuerySchema.safeParse({
      componentKey: 'app',
      days: 30.5,
    })

    expect(result.success).toBe(false)
  })

  it('should accept all defined component keys', () => {
    for (const key of [
      'app',
      'database',
      'cache',
      'auth',
      'payment',
      'email',
      'storage',
    ]) {
      const result = StatusHistoryQuerySchema.safeParse({ componentKey: key })
      expect(result.success, `key=${key}`).toBe(true)
    }
  })
})
