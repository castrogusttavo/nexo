import type { Plan } from '@prisma/client'
import { AbacatePayClient } from '@/lib/abacatepay'
import { BETTER_AUTH_URL } from '@/lib/env/server'
import { auditMutation } from '@/lib/axiom/audit'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { badRequest, forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toSubscriptionDTO } from '@/src/mappers/subscription.mapper'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'
import type { CreateSubscriptionDTO } from '@/src/schemas/subscription.schema'
import type { SubscriptionDTO } from '@/types/subscription'

const PLAN_PRODUCTS: Record<string, string> = {
  PRO: 'prod_0BcjnDNaGQZdpgnKbfnhzRJL',
  ENTERPRISE: 'prod_enterprise_placeholder',
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

    const productId = PLAN_PRODUCTS[dto.plan]
    if (!productId) {
      return err(badRequest(`Plano inválido: ${dto.plan}`))
    }

    const appUrl = BETTER_AUTH_URL

    const response = await AbacatePayClient.createSubscription({
      items: [{ id: productId, quantity: 1 }],
      methods: ['CARD'],
      returnUrl: appUrl,
      completionUrl: appUrl,
      metadata: {
        workspaceId: dto.workspaceId,
        plan: dto.plan,
      },
    })

    const bill = response.data

    const result = await SubscriptionRepository.create({
      billId: bill.id,
      plan: dto.plan as Plan,
      status: 'PENDING',
      amount: bill.amount,
      paymentUrl: bill.url,
      workspaceId: dto.workspaceId,
    })

    if (!result.ok) {
      auditMutation({
        entity: 'subscription',
        action: 'create',
        actorId,
        outcome: 'failure',
        reason: result.error.code,
        meta: { workspaceId: dto.workspaceId, plan: dto.plan },
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

      case 'subscription.cancelled': {
        const result = await SubscriptionRepository.updateStatusByBillId(
          billId,
          'CANCELLED',
        )
        if (!result.ok) {
          auditMutation({
            entity: 'subscription',
            action: 'cancel',
            actorId: null,
            targetId: subscription.value.id,
            outcome: 'failure',
            reason: result.error.code,
            meta: { billId, source: 'webhook' },
          })
          return result
        }
        auditMutation({
          entity: 'subscription',
          action: 'cancel',
          actorId: null,
          targetId: subscription.value.id,
          meta: {
            billId,
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
}
