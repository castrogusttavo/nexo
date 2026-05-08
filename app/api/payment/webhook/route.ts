import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { ABACATE_PAY_WEBHOOK_SECRET } from '@/lib/env/server'
import { SubscriptionService } from '@/src/services/subscription.service'

interface WebhookPayload {
  id: string
  event: string
  apiVersion: number
  data: {
    id: string
    status: string
  }
}

export const POST = withAxiom(async (request: NextRequest) => {
  const secret = request.headers.get('x-webhook-secret')

  if (secret !== ABACATE_PAY_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as WebhookPayload

  const { event, data } = body

  if (!event || !data?.id) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const result = await SubscriptionService.handleWebhookEvent(event, data.id)

  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json({ received: true }, { status: 200 })
})
