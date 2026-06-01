import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { CreateShortLinkSchema } from '@/src/schemas/short-link.schema'
import { ShortLinkService } from '@/src/services/short-link.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async (_request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const result = await ShortLinkService.list(auth.value.user.id)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const POST = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(auth.value.user.id, 'page:(private)')
  if (!consent.ok) return handleError(consent.error)

  const body = await request.json()
  const parsed = CreateShortLinkSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await ShortLinkService.create(auth.value.user.id, parsed.data)

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
