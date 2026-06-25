import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { mirrorPreferenceCookies } from '@/src/lib/preference-cookies'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateUserPreferenceSchema } from '@/src/schemas/user-preference.schema'
import { UserPreferenceService } from '@/src/services/user-preference.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const result = await UserPreferenceService.get(auth.value.user.id)
  if (!result.ok) return handleError(result.error)

  const response = successResponse(result.value)
  mirrorPreferenceCookies(response, result.value)
  return response
})

export const PATCH = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limited = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limited.ok) return handleError(limited.error)

  const body = await request.json()
  const parsed = UpdateUserPreferenceSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await UserPreferenceService.update(
    auth.value.user.id,
    parsed.data,
  )
  if (!result.ok) return handleError(result.error)

  const response = successResponse(result.value)
  mirrorPreferenceCookies(response, result.value)
  return response
})
