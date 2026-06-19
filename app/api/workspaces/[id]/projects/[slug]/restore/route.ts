import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ProjectService } from '@/src/services/project.service'
import { handleError, successResponse } from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string }> }

export const PATCH = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/projects/[slug]/restore',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug } = await ctx.params

  const result = await ProjectService.restore(auth.value.user.id, id, slug)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
