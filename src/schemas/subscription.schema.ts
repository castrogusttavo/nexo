import { z } from 'zod'
import { BILLING_INTERVALS } from '../config/plan-prices'
import { couponCode } from './coupon.schema'

export const CreateSubscriptionSchema = z.object({
  plan: z.enum(['PRO', 'BUSINESS']),
  workspaceId: z.string().min(1, 'workspaceId é obrigatório'),
  seats: z
    .number()
    .int('Assentos deve ser um número inteiro')
    .min(1, 'Mínimo de 1 assento')
    .max(10000, 'Máximo de 10.000 assentos'),
  interval: z.enum(BILLING_INTERVALS),
  coupon: couponCode.optional(),
})

export type CreateSubscriptionDTO = z.infer<typeof CreateSubscriptionSchema>
