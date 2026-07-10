import { describe, expect, it } from 'vitest'
import { CreateSubscriptionSchema } from '@/src/schemas/subscription.schema'

const valid = {
  plan: 'PRO',
  workspaceId: 'ws-1',
  seats: 5,
  interval: 'monthly',
}

describe('CreateSubscriptionSchema', () => {
  it('should accept PRO with seats and interval', () => {
    const result = CreateSubscriptionSchema.safeParse(valid)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(valid)
  })

  it('should accept BUSINESS on yearly interval', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      plan: 'BUSINESS',
      interval: 'yearly',
    })

    expect(result.success).toBe(true)
  })

  it('should reject FREE plan (not purchasable)', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      plan: 'FREE',
    })

    expect(result.success).toBe(false)
  })

  it('should reject ENTERPRISE plan (sales-led)', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      plan: 'ENTERPRISE',
    })

    expect(result.success).toBe(false)
  })

  it('should reject zero, negative and fractional seats', () => {
    for (const seats of [0, -1, 1.5]) {
      const result = CreateSubscriptionSchema.safeParse({ ...valid, seats })
      expect(result.success).toBe(false)
    }
  })

  it('should reject an unknown interval', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      interval: 'weekly',
    })

    expect(result.success).toBe(false)
  })

  it('should reject when seats or interval are missing', () => {
    const { seats: _s, ...noSeats } = valid
    const { interval: _i, ...noInterval } = valid

    expect(CreateSubscriptionSchema.safeParse(noSeats).success).toBe(false)
    expect(CreateSubscriptionSchema.safeParse(noInterval).success).toBe(false)
  })

  it('should reject empty workspaceId', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      workspaceId: '',
    })

    expect(result.success).toBe(false)
  })

  it('should accept an optional coupon and normalize it', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      coupon: '  black-friday  ',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.coupon).toBe('BLACK-FRIDAY')
  })

  it('should accept a subscription without a coupon', () => {
    expect(CreateSubscriptionSchema.safeParse(valid).success).toBe(true)
  })

  it('should reject a malformed coupon', () => {
    const result = CreateSubscriptionSchema.safeParse({
      ...valid,
      coupon: 'no spaces allowed',
    })

    expect(result.success).toBe(false)
  })
})
