import type { AbacatePayCoupon, AbacatePaySubscription } from '@/lib/abacatepay'

interface AbacatePayResponse<T> {
  success: boolean
  data: T
  error: string | null
}

export function createFakeAbacateSubscription(
  overrides?: Partial<AbacatePaySubscription>,
): AbacatePaySubscription {
  const now = new Date().toISOString()
  return {
    id: 'bill_test_123',
    url: 'https://pay.example.com/checkout/bill_test_123',
    amount: 4990,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

export function fakeAbacateResponse(
  bill: AbacatePaySubscription = createFakeAbacateSubscription(),
): AbacatePayResponse<AbacatePaySubscription> {
  return { success: true, data: bill, error: null }
}

export function createFakeAbacateCoupon(
  overrides?: Partial<AbacatePayCoupon>,
): AbacatePayCoupon {
  return {
    id: 'BLACKFRIDAY',
    discount: 20,
    discountKind: 'PERCENTAGE',
    status: 'ACTIVE',
    redeemsCount: 0,
    maxRedeems: -1,
    ...overrides,
  }
}
