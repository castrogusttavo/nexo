import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { AssignIssueSchema } from '@/src/schemas/issue-assignee.schema'
import { IssueAssigneeService } from '@/src/services/issue-assignee.service'
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

  const result = await IssueAssigneeService.list(
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
    'POST /api/workspaces/[id]/projects/[slug]/issues/[issueId]/assignees',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, issueId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = AssignIssueSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await IssueAssigneeService.assign(
    auth.value.user.id,
    id,
    slug,
    issueId,
    parsed.data.userId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
