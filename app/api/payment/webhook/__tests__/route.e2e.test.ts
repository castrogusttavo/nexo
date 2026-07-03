import { createId } from '@paralleldrive/cuid2'
import { describe, expect, it } from 'vitest'
import { authenticatedOwner } from '@/src/__tests__/helpers/e2e'
import { BASE_URL } from '@/src/__tests__/setup.e2e'
import { prisma } from '@/src/lib/prisma'

const SECRET = process.env.ABACATE_PAY_WEBHOOK_SECRET ?? ''

async function postWebhook(body: unknown, secret: string | null = SECRET) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret !== null) headers['x-webhook-secret'] = secret
  return fetch(`${BASE_URL}/api/payment/webhook`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function seedSubscription(opts: {
  workspaceId: string
  billId: string
  plan?: 'PRO' | 'ENTERPRISE'
  status?: 'PENDING' | 'PAID' | 'CANCELLED'
}) {
  return prisma.subscription.create({
    data: {
      billId: opts.billId,
      plan: opts.plan ?? 'PRO',
      status: opts.status ?? 'PENDING',
      amount: 4990,
      paymentUrl: 'https://pay.example.com/c/1',
      workspaceId: opts.workspaceId,
    },
  })
}

describe('POST /api/payment/webhook', () => {
  it('should return 401 when x-webhook-secret header is missing', async () => {
    const res = await postWebhook(
      { event: 'subscription.completed', data: { id: 'bill_x' } },
      null,
    )
    expect(res.status).toBe(401)
  })

  it('should return 401 when x-webhook-secret is wrong', async () => {
    const res = await postWebhook(
      { event: 'subscription.completed', data: { id: 'bill_x' } },
      'wrong-secret',
    )
    expect(res.status).toBe(401)
  })

  it('should return 400 when payload is missing event or data.id', async () => {
    const r1 = await postWebhook({ data: { id: 'b1' } })
    expect(r1.status).toBe(400)

    const r2 = await postWebhook({ event: 'subscription.completed' })
    expect(r2.status).toBe(400)

    const r3 = await postWebhook({ event: 'subscription.completed', data: {} })
    expect(r3.status).toBe(400)
  })

  it('should activate subscription and bump workspace plan on subscription.completed', async () => {
    const { workspace } = await authenticatedOwner({
      slug: `wh-${createId().slice(0, 6)}`,
    })
    const billId = `bill_complete_${createId()}`
    await seedSubscription({
      workspaceId: workspace.id,
      billId,
      plan: 'PRO',
      status: 'PENDING',
    })

    const res = await postWebhook({
      event: 'subscription.completed',
      data: { id: billId },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)

    const sub = await prisma.subscription.findUnique({ where: { billId } })
    expect(sub?.status).toBe('PAID')

    const ws = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    })
    expect(ws?.activePlan).toBe('PRO')
  })

  it('should cancel subscription and revert workspace to FREE on subscription.cancelled', async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E Cancel',
        slug: `wh-${createId().slice(0, 6)}`,
        activePlan: 'PRO',
      },
    })
    const billId = `bill_cancel_${createId()}`
    await seedSubscription({
      workspaceId: workspace.id,
      billId,
      plan: 'PRO',
      status: 'PAID',
    })

    const res = await postWebhook({
      event: 'subscription.cancelled',
      data: { id: billId },
    })

    expect(res.status).toBe(200)
    const sub = await prisma.subscription.findUnique({ where: { billId } })
    expect(sub?.status).toBe('CANCELLED')
    const refreshed = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    })
    expect(refreshed?.activePlan).toBe('FREE')
  })

  it('should expire subscription and revert workspace to FREE on subscription.expired', async () => {
    const workspace = await prisma.workspace.create({
      data: {
        name: 'E2E Expire',
        slug: `wh-${createId().slice(0, 6)}`,
        activePlan: 'BUSINESS',
      },
    })
    const billId = `bill_expire_${createId()}`
    await seedSubscription({
      workspaceId: workspace.id,
      billId,
      plan: 'PRO',
      status: 'PAID',
    })

    const res = await postWebhook({
      event: 'subscription.expired',
      data: { id: billId },
    })

    expect(res.status).toBe(200)
    const sub = await prisma.subscription.findUnique({ where: { billId } })
    expect(sub?.status).toBe('EXPIRED')
    const refreshed = await prisma.workspace.findUnique({
      where: { id: workspace.id },
    })
    expect(refreshed?.activePlan).toBe('FREE')
  })

  it('should accept unknown events without side effects', async () => {
    const { workspace } = await authenticatedOwner({
      slug: `wh-${createId().slice(0, 6)}`,
    })
    const billId = `bill_unknown_${createId()}`
    await seedSubscription({
      workspaceId: workspace.id,
      billId,
      status: 'PENDING',
    })

    const res = await postWebhook({
      event: 'subscription.something_else',
      data: { id: billId },
    })

    expect(res.status).toBe(200)
    const sub = await prisma.subscription.findUnique({ where: { billId } })
    expect(sub?.status).toBe('PENDING')
  })

  it('should return 500 when billId does not exist', async () => {
    const res = await postWebhook({
      event: 'subscription.completed',
      data: { id: 'bill_does_not_exist' },
    })

    expect(res.status).toBe(500)
  })
})
