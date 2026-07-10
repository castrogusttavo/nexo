import { createId } from '@paralleldrive/cuid2'
import type {
  BillingInterval,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client'
import { prisma } from '@/src/lib/prisma'
import type { SubscriptionDTO } from '@/types/subscription'

export function createFakeSubscription(
  overrides?: Partial<Subscription>,
): Subscription {
  const now = new Date()
  return {
    id: createId(),
    billId: `bill_${createId()}`,
    plan: 'PRO' as Plan,
    status: 'PENDING' as SubscriptionStatus,
    amount: 4990,
    seats: 1,
    interval: 'MONTHLY' as BillingInterval,
    coupon: null,
    paymentUrl: 'https://pay.example.com/checkout',
    workspaceId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function createFakeSubscriptionDTO(
  overrides?: Partial<SubscriptionDTO>,
): SubscriptionDTO {
  const now = new Date().toISOString()
  return {
    id: createId(),
    billId: `bill_${createId()}`,
    plan: 'PRO',
    status: 'PENDING',
    amount: 4990,
    seats: 1,
    interval: 'monthly',
    coupon: null,
    paymentUrl: 'https://pay.example.com/checkout',
    workspaceId: createId(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export async function seedSubscription(data: {
  workspaceId: string
  billId?: string
  plan?: Plan
  status?: SubscriptionStatus
  amount?: number
  seats?: number
  interval?: BillingInterval
  paymentUrl?: string
}) {
  return prisma.subscription.create({
    data: {
      billId: data.billId ?? `bill_${createId()}`,
      plan: data.plan ?? 'PRO',
      status: data.status ?? 'PENDING',
      amount: data.amount ?? 4990,
      seats: data.seats ?? 1,
      interval: data.interval ?? 'MONTHLY',
      paymentUrl: data.paymentUrl ?? 'https://pay.example.com/checkout',
      workspaceId: data.workspaceId,
    },
  })
}
