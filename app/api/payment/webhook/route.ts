import type { NextRequest } from 'next/server'
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

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret')

  if (secret !== ABACATE_PAY_WEBHOOK_SECRET) {
    console.log('[webhook] invalid secret')
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as WebhookPayload

  console.log('[webhook] payload received', JSON.stringify(body, null, 2))

  const { event, data } = body

  if (!event || !data?.id) {
    console.log('[webhook] invalid payload', { event, data })
    return Response.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const result = await SubscriptionService.handleWebhookEvent(event, data.id)

  if (!result.ok) {
    console.log('[webhook] service error', result.error)
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  console.log('[webhook] processed successfully', { event, billId: data.id })
  return Response.json({ received: true }, { status: 200 })
}
