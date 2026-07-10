export interface CouponPreviewDTO {
  code: string
  discount: number
  discountKind: 'PERCENTAGE' | 'FIXED'
}
