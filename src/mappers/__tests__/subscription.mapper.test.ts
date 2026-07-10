import { describe, expect, it } from 'vitest'
import { createFakeSubscription } from '@/src/__tests__/factories/subscription.factory'
import { toSubscriptionDTO } from '@/src/mappers/subscription.mapper'

describe('toSubscriptionDTO()', () => {
  it('should map all fields correctly', () => {
    const sub = createFakeSubscription({
      id: 'sub-1',
      billId: 'bill_1',
      plan: 'PRO',
      status: 'PAID',
      amount: 4990,
      paymentUrl: 'https://pay/c/1',
      workspaceId: 'ws-1',
    })

    const dto = toSubscriptionDTO(sub)

    expect(dto).toEqual({
      id: 'sub-1',
      billId: 'bill_1',
      plan: 'PRO',
      status: 'PAID',
      amount: 4990,
      seats: 1,
      interval: 'monthly',
      coupon: null,
      paymentUrl: 'https://pay/c/1',
      workspaceId: 'ws-1',
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    })
  })

  it('should serialize timestamps as ISO strings', () => {
    const created = new Date('2025-03-10T12:00:00.000Z')
    const updated = new Date('2025-03-11T12:00:00.000Z')
    const sub = createFakeSubscription({
      createdAt: created,
      updatedAt: updated,
    })

    const dto = toSubscriptionDTO(sub)

    expect(dto.createdAt).toBe('2025-03-10T12:00:00.000Z')
    expect(dto.updatedAt).toBe('2025-03-11T12:00:00.000Z')
  })

  it('should preserve PENDING status from factory default', () => {
    const dto = toSubscriptionDTO(createFakeSubscription())

    expect(dto.status).toBe('PENDING')
    expect(dto.plan).toBe('PRO')
  })

  it('should map interval to the lowercase API value', () => {
    const monthly = createFakeSubscription({ interval: 'MONTHLY', seats: 3 })
    const yearly = createFakeSubscription({ interval: 'YEARLY' })

    expect(toSubscriptionDTO(monthly).interval).toBe('monthly')
    expect(toSubscriptionDTO(monthly).seats).toBe(3)
    expect(toSubscriptionDTO(yearly).interval).toBe('yearly')
  })
})
