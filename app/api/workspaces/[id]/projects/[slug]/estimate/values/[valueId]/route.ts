import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateEstimateValueSchema } from '@/src/schemas/estimate.schema'
import { EstimateService } from '@/src/services/estimate.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; slug: string; valueId: string }>
}

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/projects/[slug]/estimate/values/[valueId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, valueId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = UpdateEstimateValueSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await EstimateService.updateValue(
    auth.value.user.id,
    id,
    slug,
    valueId,
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

  const consent = await requireConsent(
    auth.value.user.id,
    'DELETE /api/workspaces/[id]/projects/[slug]/estimate/values/[valueId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, valueId } = await ctx.params

  const result = await EstimateService.deleteValue(
    auth.value.user.id,
    id,
    slug,
    valueId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
