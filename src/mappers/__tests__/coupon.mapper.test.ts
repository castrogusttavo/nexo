import { describe, expect, it } from 'vitest'
import { createFakeAbacateCoupon } from '@/src/__tests__/mocks/abacatepay.mock'
import { toCouponPreviewDTO } from '../coupon.mapper'

describe('toCouponPreviewDTO()', () => {
  it('maps the gateway coupon to the preview DTO', () => {
    const dto = toCouponPreviewDTO(
      createFakeAbacateCoupon({
        id: 'PROMO10',
        discount: 1000,
        discountKind: 'FIXED',
      }),
    )
    expect(dto).toEqual({
      code: 'PROMO10',
      discount: 1000,
      discountKind: 'FIXED',
    })
  })
})
