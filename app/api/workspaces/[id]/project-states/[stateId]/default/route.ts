import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ProjectStateService } from '@/src/services/project-state.service'
import { handleError, successResponse } from '@/utils/http-response'

type Params = { params: Promise<{ id: string; stateId: string }> }

export const PATCH = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/project-states/[stateId]/default',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, stateId } = await ctx.params

  const result = await ProjectStateService.setDefault(
    auth.value.user.id,
    id,
    stateId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
