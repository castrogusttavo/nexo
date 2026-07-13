import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAxiom } from '@/lib/axiom/server'
import { ABACATE_PAY_WEBHOOK_SECRET } from '@/lib/env/server'
import { SubscriptionService } from '@/src/services/subscription.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

const WebhookPayloadSchema = z.object({
  id: z.string(),
  event: z.string(),
  apiVersion: z.number(),
  data: z.object({
    id: z.string(),
    status: z.string(),
  }),
})

export const POST = withAxiom(async (request: NextRequest) => {
  const secret = request.headers.get('x-webhook-secret')

  if (!secret || !constantTimeEqual(secret, ABACATE_PAY_WEBHOOK_SECRET)) {
    return standardError('UNAUTHORIZED', 'Invalid webhook secret')
  }

  const body = await request.json().catch(() => null)
  const parsed = WebhookPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Payload inválido',
      parsed.error.issues,
    )
  }

  const { event, data } = parsed.data

  const result = await SubscriptionService.handleWebhookEvent(event, data.id)
  if (!result.ok) return handleError(result.error)

  return successResponse({ received: true })
})
