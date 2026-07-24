import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { CycleService } from '@/src/services/cycle.service'
import { handleError, successResponse } from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; slug: string; cycleId: string; userId: string }>
}

export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'DELETE /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]/members/[userId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, cycleId, userId } = await ctx.params

  const result = await CycleService.removeMember(
    auth.value.user.id,
    id,
    slug,
    cycleId,
    userId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
