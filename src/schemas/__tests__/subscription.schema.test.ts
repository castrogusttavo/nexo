import { describe, expect, it } from 'vitest'
import { CreateSubscriptionSchema } from '@/src/schemas/subscription.schema'

describe('CreateSubscriptionSchema', () => {
  it('should accept PRO plan', () => {
    const result = CreateSubscriptionSchema.safeParse({
      plan: 'PRO',
      workspaceId: 'ws-1',
    })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ plan: 'PRO', workspaceId: 'ws-1' })
  })

  it('should accept ENTERPRISE plan', () => {
    const result = CreateSubscriptionSchema.safeParse({
      plan: 'ENTERPRISE',
      workspaceId: 'ws-1',
    })

    expect(result.success).toBe(true)
  })

  it('should reject BASIC plan (not purchasable)', () => {
    const result = CreateSubscriptionSchema.safeParse({
      plan: 'BASIC',
      workspaceId: 'ws-1',
    })

    expect(result.success).toBe(false)
  })

  it('should reject unknown plan', () => {
    const result = CreateSubscriptionSchema.safeParse({
      plan: 'GOD_MODE',
      workspaceId: 'ws-1',
    })

    expect(result.success).toBe(false)
  })

  it('should reject empty workspaceId', () => {
    const result = CreateSubscriptionSchema.safeParse({
      plan: 'PRO',
      workspaceId: '',
    })

    expect(result.success).toBe(false)
  })

  it('should reject when workspaceId is missing', () => {
    const result = CreateSubscriptionSchema.safeParse({ plan: 'PRO' })

    expect(result.success).toBe(false)
  })
})
