import z from 'zod'

export const couponCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/i, 'Cupom inválido')

export const ValidateCouponSchema = z.object({
  code: couponCode,
})

export type ValidateCouponDTO = z.infer<typeof ValidateCouponSchema>
