import type { NextRequest } from 'next/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { CreateSubscriptionSchema } from '@/src/schemas/subscription.schema'
import { SubscriptionService } from '@/src/services/subscription.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export async function POST(request: NextRequest) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const body = await request.json()
  const parsed = CreateSubscriptionSchema.safeParse(body)

  if (!parsed.success) {
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

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
}
