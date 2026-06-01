import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateShortLinkSchema } from '@/src/schemas/short-link.schema'
import { ShortLinkService } from '@/src/services/short-link.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(auth.value.user.id, 'page:(private)')
  if (!consent.ok) return handleError(consent.error)

  const [{ id }, body] = await Promise.all([ctx.params, request.json()])
  const parsed = UpdateShortLinkSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await ShortLinkService.update(
    auth.value.user.id,
    id,
    parsed.data,
  )

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(auth.value.user.id, 'page:(private)')
  if (!consent.ok) return handleError(consent.error)

  const { id } = await ctx.params

  const result = await ShortLinkService.delete(auth.value.user.id, id)

  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
