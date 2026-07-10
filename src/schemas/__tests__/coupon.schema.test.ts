import { describe, expect, it } from 'vitest'
import { ValidateCouponSchema } from '../coupon.schema'

describe('ValidateCouponSchema', () => {
  it('accepts a valid code', () => {
    const result = ValidateCouponSchema.safeParse({ code: 'BLACKFRIDAY' })
    expect(result.success).toBe(true)
  })

  it('trims and uppercases the code', () => {
    const result = ValidateCouponSchema.safeParse({
      code: '   black-friday_20   ',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.code).toBe('BLACK-FRIDAY_20')
  })

  it('reject codes that are too short or too long', () => {
    expect(ValidateCouponSchema.safeParse({ code: 'AB' }).success).toBe(false)
    expect(
      ValidateCouponSchema.safeParse({ code: 'A'.repeat(33) }).success,
    ).toBe(false)
  })

  it('rejects invalid characters', () => {
    expect(
      ValidateCouponSchema.safeParse({ code: 'BLACK FRIDAY' }).success,
    ).toBe(false)
    expect(ValidateCouponSchema.safeParse({ code: 'PROMO@2026' }).success).toBe(
      false,
    )
  })

  it('rejects a missing code', () => {
    expect(ValidateCouponSchema.safeParse({}).success).toBe(false)
  })
})
