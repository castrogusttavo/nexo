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
}
