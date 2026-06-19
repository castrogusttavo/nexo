import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateStickyNoteSchema } from '@/src/schemas/sticky-note.schema'
import { StickyNoteService } from '@/src/services/sticky-note.service'
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
  const parsed = UpdateStickyNoteSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await StickyNoteService.update(
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

  const result = await StickyNoteService.delete(auth.value.user.id, id)

  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
