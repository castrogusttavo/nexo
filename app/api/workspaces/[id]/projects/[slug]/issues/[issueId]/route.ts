import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateIssueSchema } from '@/src/schemas/issue.schema'
import { IssueService } from '@/src/services/issue.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string; issueId: string }> }

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/projects/[slug]/issues/[issueId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, issueId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = UpdateIssueSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await IssueService.update(
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
    'DELETE /api/workspaces/[id]/projects/[slug]/issues/[issueId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, issueId } = await ctx.params

  const result = await IssueService.delete(
    auth.value.user.id,
    id,
    slug,
    issueId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
