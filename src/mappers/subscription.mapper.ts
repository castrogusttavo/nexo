import type { Subscription } from '@prisma/client'
import type { SubscriptionDTO } from '@/types/subscription'

export function toSubscriptionDTO(subscription: Subscription): SubscriptionDTO {
  return {
    id: subscription.id,
    billId: subscription.billId,
    plan: subscription.plan,
    status: subscription.status,
    amount: subscription.amount,
    seats: subscription.seats,
    interval: subscription.interval === 'YEARLY' ? 'yearly' : 'monthly',
    coupon: subscription.coupon,
    paymentUrl: subscription.paymentUrl,
    workspaceId: subscription.workspaceId,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  }
}
