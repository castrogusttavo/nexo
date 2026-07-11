import type { BillingInterval, Plan, Subscription } from '@prisma/client'
import { AbacatePayClient } from '@/lib/abacatepay'
import { auditMutation } from '@/lib/axiom/audit'
import { logger } from '@/lib/axiom/logger'
import { BETTER_AUTH_URL } from '@/lib/env/server'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { forbidden, paymentError } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toSubscriptionDTO } from '@/src/mappers/subscription.mapper'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'
import type { CreateSubscriptionDTO } from '@/src/schemas/subscription.schema'
import type { SubscriptionDTO } from '@/types/subscription'
import { PAID_PLAN_PRICES } from '../config/plan-prices'
import { CouponService } from './coupon.service'

const PLAN_PRODUCTS: Record<
  CreateSubscriptionDTO['plan'],
  Record<CreateSubscriptionDTO['interval'], string>
> = {
  PRO: {
    monthly: 'prod_hhYrXssxdQuRx1TcNAH4YpH3',
    yearly: 'prod_3ShyESQSCAS4YtUhaPj6cJMR',
  },
  BUSINESS: {
    monthly: 'prod_BgZbxqmJKdRgdFMBGjgJHWzh',
    yearly: 'prod_pKMcBAhqDXZUyTcn4geBPDje',
  },
}

function intervalToPrisma(
  interval: CreateSubscriptionDTO['interval'],
): BillingInterval {
  return interval === 'yearly' ? 'YEARLY' : 'MONTHLY'
}

export const SubscriptionService = {
  async create(
    actorId: string,
    dto: CreateSubscriptionDTO,
  ): Promise<Result<SubscriptionDTO>> {
    const membership = await MembershipRepository.findByUserAndWorkspace(
      actorId,
      dto.workspaceId,
    )
    if (!membership.ok) return membership
    if (!membership.value) return err(forbidden())

    if (!['OWNER', 'ADMIN'].includes(membership.value.role)) {
      return err(forbidden('Apenas OWNER ou ADMIN podem alterar o plano'))
    }

    if (dto.coupon) {
      const coupon = await CouponService.validate({ code: dto.coupon })
      if (!coupon.ok) return coupon
    }

    const productId = PLAN_PRODUCTS[dto.plan][dto.interval]
    const appUrl = BETTER_AUTH_URL

    let bill: Awaited<
      ReturnType<typeof AbacatePayClient.createSubscription>
    >['data']
    try {
      const response = await AbacatePayClient.createSubscription({
        items: [{ id: productId, quantity: dto.seats }],
        methods: ['CARD'],
        returnUrl: appUrl,
        completionUrl: appUrl,
        ...(dto.coupon ? { coupons: [dto.coupon] } : {}),
        metadata: {
          workspaceId: dto.workspaceId,
          plan: dto.plan,
          seats: dto.seats,
          interval: dto.interval,
          ...(dto.coupon ? { coupons: dto.coupon } : {}),
        },
      })
      bill = response.data
    } catch (error) {
      logger.error('subscription.gateway_failed', {
        workspaceId: dto.workspaceId,
        plan: dto.plan,
        interval: dto.interval,
        seats: dto.seats,
        message: error instanceof Error ? error.message : String(error),
      })
      auditMutation({
        entity: 'subscription',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: 'PAYMENT_ERROR',
        meta: { workspaceId: dto.workspaceId, plan: dto.plan },
      })
      return err(paymentError())
    }

    const listAmount = PAID_PLAN_PRICES[dto.plan][dto.interval] * dto.seats
    const amountValid = dto.coupon
      ? bill.amount >= 0 && bill.amount <= listAmount
      : bill.amount === listAmount

    if (!amountValid) {
      logger.error('subscription.amount_mismatch', {
        workspaceId: dto.workspaceId,
        plan: dto.plan,
        interval: dto.interval,
        seats: dto.seats,
        coupon: dto.coupon ?? null,
        expected: listAmount,
        charged: bill.amount,
        billId: bill.id,
      })
      auditMutation({
        entity: 'subscription',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: 'PAYMENT_AMOUNT_MISMATCH',
        meta: {
          workspaceId: dto.workspaceId,
          plan: dto.plan,
          expected: listAmount,
          charged: bill.amount,
        },
      })
      return err(paymentError('Valor cobrado divergente do esperado'))
    }

    const result = await SubscriptionRepository.create({
      billId: bill.id,
      plan: dto.plan as Plan,
      status: 'PENDING',
      amount: bill.amount,
      paymentUrl: bill.url,
      workspaceId: dto.workspaceId,
      seats: dto.seats,
      interval: intervalToPrisma(dto.interval),
      coupon: dto.coupon ?? null,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'subscription',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
        meta: {
          workspaceId: dto.workspaceId,
          plan: dto.plan,
          seats: dto.seats,
          interval: dto.interval,
        },
      })
      return result
    }

    auditMutation({
      entity: 'subscription',
      action: 'create',
      actorId,
      targetId: result.value.id,
      meta: {
        workspaceId: dto.workspaceId,
        plan: dto.plan,
        billId: bill.id,
        seats: dto.seats,
        interval: dto.interval,
        coupon: dto.coupon ?? null,
      },
    })

    return ok(toSubscriptionDTO(result.value))
  },

  async handleWebhookEvent(
    event: string,
    billId: string,
  ): Promise<Result<void>> {
    const subscription = await SubscriptionRepository.findByBillId(billId)
    if (!subscription.ok) return subscription

    switch (event) {
      case 'subscription.completed': {
        const result = await SubscriptionRepository.activateWithPlan(
          billId,
          subscription.value.plan,
        )
        if (!result.ok) {
          auditMutation({
            entity: 'subscription',
            action: 'activate',
            actorId: null,
            targetId: subscription.value.id,
            outcome: 'failure',
            reason: result.error.code,
            meta: { billId, source: 'webhook' },
          })
          return result
        }

        await WorkspaceCache.invalidate(subscription.value.workspaceId)
        auditMutation({
          entity: 'subscription',
          action: 'activate',
          actorId: null,
          targetId: subscription.value.id,
          meta: {
            billId,
            workspaceId: subscription.value.workspaceId,
            plan: subscription.value.plan,
            source: 'webhook',
          },
        })
        return ok(undefined)
      }

      case 'subscription.cancelled':
      case 'subscription.expired': {
        const status =
          event === 'subscription.expired' ? 'EXPIRED' : 'CANCELLED'
        const result = await SubscriptionRepository.deactivateByBillId(
          billId,
          status,
        )
        if (!result.ok) {
          auditMutation({
            entity: 'subscription',
            action: 'cancel',
            actorId: null,
            targetId: subscription.value.id,
            outcome: 'failure',
            reason: result.error.code,
            meta: { billId, event, source: 'webhook' },
          })
          return result
        }

        await WorkspaceCache.invalidate(subscription.value.workspaceId)
        auditMutation({
          entity: 'subscription',
          action: 'cancel',
          actorId: null,
          targetId: subscription.value.id,
          meta: {
            billId,
            event,
            workspaceId: subscription.value.workspaceId,
            source: 'webhook',
          },
        })

        return ok(undefined)
      }

      default:
        return ok(undefined)
    }
  },

  async getActiveByWorkspace(
    workspaceId: string,
  ): Promise<Result<Subscription | null>> {
    return SubscriptionRepository.findActiveByWorkspaceId(workspaceId)
  },
}
