import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateNotificationSettingSchema } from '@/src/schemas/notification-settings.schema'
import { NotificationSettingService } from '@/src/services/notification-setting.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const result = await NotificationSettingService.get(auth.value.user.id)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const PATCH = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limited = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limited.ok) return handleError(limited.error)

  const body = await request.json()
  const parsed = UpdateNotificationSettingSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await NotificationSettingService.update(
    auth.value.user.id,
    parsed.data,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
