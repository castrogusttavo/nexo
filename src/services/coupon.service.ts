import { AbacatePayClient } from '@/lib/abacatepay'
import { logger } from '@/lib/axiom/logger'
import type { CouponPreviewDTO } from '@/types/coupon'
import { couponInvalid, paymentError } from '../errors'
import { err, ok, type Result } from '../lib/result'
import { toCouponPreviewDTO } from '../mappers/coupon.mapper'
import type { ValidateCouponDTO } from '../schemas/coupon.schema'

export const CouponService = {
  async validate(dto: ValidateCouponDTO): Promise<Result<CouponPreviewDTO>> {
    let coupon: Awaited<ReturnType<typeof AbacatePayClient.getCoupon>>

    try {
      coupon = await AbacatePayClient.getCoupon(dto.code)
    } catch (error) {
      logger.error('coupon.validate_gateway_failed', {
        code: dto.code,
        message: error instanceof Error ? error.message : String(error),
      })
      return err(paymentError('Não foi possível validar o cupom'))
    }

    const exhausted =
      coupon !== null &&
      coupon.maxRedeems !== -1 &&
      coupon.redeemsCount >= coupon.maxRedeems

    if (!coupon || coupon.status !== 'ACTIVE' || exhausted) {
      return err(couponInvalid())
    }

    return ok(toCouponPreviewDTO(coupon))
  },
}
