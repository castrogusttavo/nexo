import type {
  BillingInterval,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client'
import { notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import { dbError } from './db-error'

export const SubscriptionRepository = {
  async create(data: {
    billId: string
    plan: Plan
    status: SubscriptionStatus
    amount: number
    seats: number
    interval: BillingInterval
    coupon?: string | null
    paymentUrl: string
    workspaceId: string
  }): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.subscription.create({ data })
      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to create subscription', error))
    }
  },

  async findByBillId(billId: string): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { billId },
      })

      if (!subscription) {
        return err(notFound('Subscription'))
      }

      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to find subscription', error))
    }
  },

  async findActiveByWorkspaceId(
    workspaceId: string,
  ): Promise<Result<Subscription | null>> {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { workspaceId, status: 'PAID' },
        orderBy: { createdAt: 'desc' },
      })
      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to find active subscription', error))
    }
  },

  async updateStatusByBillId(
    billId: string,
    status: SubscriptionStatus,
  ): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.subscription.update({
        where: { billId },
        data: { status },
      })
      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to update subscription status', error))
    }
  },

  async activateWithPlan(
    billId: string,
    plan: Plan,
  ): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.update({
          where: { billId },
          data: { status: 'PAID' },
        })

        await tx.workspace.update({
          where: { id: sub.workspaceId },
          data: { activePlan: plan },
        })

        return sub
      })
      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to activate subscription', error))
    }
  },

  async deactivateByBillId(
    billId: string,
    status: SubscriptionStatus,
  ): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.update({
          where: { billId },
          data: { status },
        })

        await tx.workspace.update({
          where: { id: sub.workspaceId },
          data: { activePlan: 'FREE' },
        })

        return sub
      })
      return ok(subscription)
    } catch (error) {
      return err(dbError('Failed to deactivate subscription', error))
    }
  },
}
