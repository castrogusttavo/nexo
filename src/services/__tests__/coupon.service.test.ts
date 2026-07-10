import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expectErr, expectOk } from '@/src/__tests__/helpers/result.helpers'
import { createFakeAbacateCoupon } from '@/src/__tests__/mocks/abacatepay.mock'
import { CouponService } from '../coupon.service'

vi.mock('@/lib/abacatepay', () => ({
  AbacatePayClient: { getCoupon: vi.fn() },
}))

import { AbacatePayClient } from '@/lib/abacatepay'

const mockedAbacate = vi.mocked(AbacatePayClient)

describe('CouponService.validate()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the preview for an active coupon', async () => {
    mockedAbacate.getCoupon.mockResolvedValue(
      createFakeAbacateCoupon({
        id: 'BLACKFRIDAY',
        discount: 20,
        discountKind: 'PERCENTAGE',
      }),
    )

    const preview = expectOk(
      await CouponService.validate({ code: 'BLACKFRIDAY' }),
    )
    expect(preview).toEqual({
      code: 'BLACKFRIDAY',
      discount: 20,
      discountKind: 'PERCENTAGE',
    })
  })

  it('return CUPON_INVALID when the coupon does not exist', async () => {
    mockedAbacate.getCoupon.mockResolvedValue(null)
    expectErr(await CouponService.validate({ code: 'NOPE' }), 'COUPON_INVALID')
  })

  it('returns COUPON_INVALID for inactive or expired coupons', async () => {
    for (const status of ['INACTIVE', 'EXPIRED'] as const) {
      mockedAbacate.getCoupon.mockResolvedValue(
        createFakeAbacateCoupon({ status }),
      )
      expectErr(await CouponService.validate({ code: 'X' }), 'COUPON_INVALID')
    }
  })

  it('returns COUPON_INVALID when the coupon is exhausted', async () => {
    mockedAbacate.getCoupon.mockResolvedValue(
      createFakeAbacateCoupon({ maxRedeems: 5, redeemsCount: 5 }),
    )
    expectErr(await CouponService.validate({ code: 'X' }), 'COUPON_INVALID')
  })

  it('returns PAYMENT_ERROR when the gateway call fails', async () => {
    mockedAbacate.getCoupon.mockRejectedValue(new Error('gateway down'))
    expectErr(await CouponService.validate({ code: 'X' }), 'PAYMENT_ERROR')
  })
})
