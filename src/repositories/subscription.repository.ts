import type { Plan, Subscription, SubscriptionStatus } from '@prisma/client'
import { databaseError, notFound } from '@/src/errors'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'

export const SubscriptionRepository = {
  async create(data: {
    billId: string
    plan: Plan
    status: SubscriptionStatus
    amount: number
    paymentUrl: string
    workspaceId: string
  }): Promise<Result<Subscription>> {
    try {
      const subscription = await prisma.subscription.create({ data })
      return ok(subscription)
    } catch {
      return err(databaseError('Failed to create subscription'))
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
    } catch {
      return err(databaseError('Failed to find subscription'))
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
    } catch {
      return err(databaseError('Failed to find active subscription'))
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
    } catch {
      return err(databaseError('Failed to update subscription status'))
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
    } catch {
      return err(databaseError('Failed to activate subscription'))
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
    } catch {
      return err(databaseError('Failed to deactivate subscription'))
    }
  },
}
