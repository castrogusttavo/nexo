import type { AbacatePayCoupon } from '@/lib/abacatepay'
import type { CouponPreviewDTO } from '@/types/coupon'

export function toCouponPreviewDTO(coupon: AbacatePayCoupon): CouponPreviewDTO {
  return {
    code: coupon.id,
    discount: coupon.discount,
    discountKind: coupon.discountKind,
  }
}
