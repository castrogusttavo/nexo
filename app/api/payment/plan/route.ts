import type { NextRequest } from 'next/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { CreateSubscriptionSchema } from '@/src/schemas/subscription.schema'
import { SubscriptionService } from '@/src/services/subscription.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export async function POST(request: NextRequest) {
  const auth = await getAuthSession()
  if (!auth.ok) {
    console.log('[payment/plan] auth failed', auth.error)
    return handleError(auth.error)
  }

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  console.log('[payment/plan] authenticated user', {
    userId: auth.value.user.id,
    userWorkspaceId: auth.value.user.workspaceId,
  })

  const body = await request.json()
  console.log('[payment/plan] request body', body)

  const parsed = CreateSubscriptionSchema.safeParse(body)

  if (!parsed.success) {
    console.log('[payment/plan] validation failed', parsed.error.issues)
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await SubscriptionService.create(
    auth.value.user.id,
    parsed.data,
  )

  if (!result.ok) {
    console.log('[payment/plan] service error', result.error)
    return handleError(result.error)
  }

  console.log('[payment/plan] subscription created', result.value)
  return successResponse(result.value, 201)
}
