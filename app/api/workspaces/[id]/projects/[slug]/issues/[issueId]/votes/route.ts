import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { CastIssueVoteSchema } from '@/src/schemas/issue-vote.schema'
import { IssueVoteService } from '@/src/services/issue-vote.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; slug: string; issueId: string }>
}

export const GET = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug, issueId } = await ctx.params

  const result = await IssueVoteService.summary(
    auth.value.user.id,
    id,
    slug,
    issueId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'POST /api/workspace/[id]/projects/[slug]/issues/[issueId]/votes',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, issueId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = CastIssueVoteSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await IssueVoteService.cast(
    auth.value.user.id,
    id,
    slug,
    issueId,
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
    'DELETE /api/workspace/[id]/projects/[slug]/issues/[issueId]/votes',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, issueId } = await ctx.params

  const result = await IssueVoteService.retract(
    auth.value.user.id,
    id,
    slug,
    issueId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
