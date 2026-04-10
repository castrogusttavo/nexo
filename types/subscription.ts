import type { SubscriptionStatus } from '@prisma/client'

export interface SubscriptionDTO {
  id: string
  billId: string
  plan: string
  status: SubscriptionStatus
  amount: number
  paymentUrl: string
  workspaceId: string
  createdAt: string
  updatedAt: string
}
