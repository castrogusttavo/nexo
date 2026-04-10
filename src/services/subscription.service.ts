import type { Plan } from '@prisma/client'
import { AbacatePayClient } from '@/lib/abacatepay'
import { BETTER_AUTH_URL } from '@/lib/env/server'
import { WorkspaceCache } from '@/src/cache/workspace.cache'
import { badRequest, forbidden } from '@/src/errors'
import { err, ok, type Result } from '@/src/lib/result'
import { toSubscriptionDTO } from '@/src/mappers/subscription.mapper'
import { SubscriptionRepository } from '@/src/repositories/subscription.repository'
import { UserRepository } from '@/src/repositories/user.repository'
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
    const actor = await UserRepository.findById(actorId)
    if (!actor.ok) return actor

    if (actor.value.workspaceId !== dto.workspaceId) {
      return err(forbidden())
    }

    if (!['OWNER', 'ADMIN'].includes(actor.value.role)) {
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

    if (!result.ok) return result

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
        if (!result.ok) return result

        await WorkspaceCache.invalidate(subscription.value.workspaceId)
        return ok(undefined)
      }

      case 'subscription.cancelled': {
        const result = await SubscriptionRepository.updateStatusByBillId(
          billId,
          'CANCELLED',
        )
        if (!result.ok) return result
        return ok(undefined)
      }

      default:
        return ok(undefined)
    }
  },
}
