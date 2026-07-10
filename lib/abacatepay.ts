import 'server-only'
import { ABACATE_PAY } from '@/lib/env/server'

const BASE_URL = 'https://api.abacatepay.com/v2'

interface SubscriptionItem {
  id: string
  quantity: number
}

interface CreateSubscriptionRequest {
  items: SubscriptionItem[]
  methods?: string[]
  customerId?: string
  coupons?: string[]
  returnUrl?: string
  completionUrl?: string
  metadata?: Record<string, unknown>
}

export interface AbacatePaySubscription {
  id: string
  url: string
  amount: number
  status: string
  createdAt: string
  updatedAt: string
}

export interface AbacatePayCoupon {
  id: string
  discount: number
  discountKind: 'PERCENTAGE' | 'FIXED'
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED'
  redeemsCount: number
  maxRedeems: number
}

interface AbacatePayResponse<T> {
  success: boolean
  data: T
  error: string | null
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<AbacatePayResponse<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${ABACATE_PAY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? `AbacatePay request failed: ${response.status}`)
  }

  return data as AbacatePayResponse<T>
}

export const AbacatePayClient = {
  async createSubscription(
    params: CreateSubscriptionRequest,
  ): Promise<AbacatePayResponse<AbacatePaySubscription>> {
    return request<AbacatePaySubscription>('/subscriptions/create', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  async getCoupon(code: string): Promise<AbacatePayCoupon | null> {
    const response = await fetch(
      `${BASE_URL}/coupons/get?id=${encodeURIComponent(code)}`,
      {
        headers: {
          Authorization: `Bearer ${ABACATE_PAY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (response.status === 404) return null

    const data = await response.json()
    if (!response.ok) {
      throw new Error(
        data.error ?? `AbacatePay coupon fetch failed: ${response.status}`
      )
    }
    return data.data as AbacatePayCoupon
  }
}
