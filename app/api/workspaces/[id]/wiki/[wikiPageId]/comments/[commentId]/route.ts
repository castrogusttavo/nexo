import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateWikiCommentSchema } from '@/src/schemas/wiki-comment.schema'
import { WikiCommentService } from '@/src/services/wiki-comment.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; wikiPageId: string; commentId: string }>
}

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/wiki/[wikiPageId]/comments/[commentId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, wikiPageId, commentId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = UpdateWikiCommentSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await WikiCommentService.update(
    auth.value.user.id,
    id,
    wikiPageId,
    commentId,
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
    'DELETE /api/workspaces/[id]/wiki/[wikiPageId]/comments/[commentId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, wikiPageId, commentId } = await ctx.params

  const result = await WikiCommentService.delete(
    auth.value.user.id,
    id,
    wikiPageId,
    commentId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
