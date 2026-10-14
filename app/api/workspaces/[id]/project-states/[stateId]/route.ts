import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateProjectStateSchema } from '@/src/schemas/project-state.schema'
import { ProjectStateService } from '@/src/services/project-state.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; stateId: string }> }

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'PATCH /api/workspaces/[id]/project-states/[stateId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, stateId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = UpdateProjectStateSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await ProjectStateService.update(
    auth.value.user.id,
    id,
    stateId,
    parsed.data,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

// Returns where the state's projects went and how many, so the UI can say so.
export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'DELETE /api/workspaces/[id]/project-states/[stateId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, stateId } = await ctx.params

  const result = await ProjectStateService.delete(
    auth.value.user.id,
    id,
    stateId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
