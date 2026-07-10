import { BillingInterval } from '@/src/config/plan-prices'
import type { SubscriptionStatus } from '@prisma/client'

export interface SubscriptionDTO {
  id: string
  billId: string
  plan: string
  status: SubscriptionStatus
  amount: number
  seats: number
  interval: BillingInterval
  coupon: string | null
  paymentUrl: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}
