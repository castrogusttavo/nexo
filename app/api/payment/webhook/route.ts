import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAxiom } from '@/lib/axiom/server'
import { ABACATE_PAY_WEBHOOK_SECRET } from '@/lib/env/server'
import { SubscriptionService } from '@/src/services/subscription.service'

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

// Only the fields the handler actually reads are required — AbacatePay's
// real payload carries more (id, apiVersion, data.status), but validating
// fields we don't consume just makes this brittle against upstream additions.
const WebhookPayloadSchema = z.object({
  event: z.string(),
  data: z.object({
    id: z.string(),
  }),
})

export const POST = withAxiom(async (request: NextRequest) => {
  const secret = request.headers.get('x-webhook-secret')

  if (!secret || !constantTimeEqual(secret, ABACATE_PAY_WEBHOOK_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = WebhookPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { event, data } = parsed.data

  const result = await SubscriptionService.handleWebhookEvent(event, data.id)

  if (!result.ok) {
    // Flat 500 (not the app's usual per-code status mapping) is
    // deliberate here: AbacatePay retries on 5xx, so a transient lookup
    // failure (e.g. webhook arriving before our own write lands) gets
    // retried instead of treated as a permanent 4xx rejection.
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json({ received: true }, { status: 200 })
})
