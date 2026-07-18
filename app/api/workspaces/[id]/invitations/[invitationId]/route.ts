import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateInvitationRoleSchema } from '@/src/schemas/invitation.schema'
import { InvitationService } from '@/src/services/invitation.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; invitationId: string }> }

export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, invitationId } = await ctx.params
  const result = await InvitationService.revoke(
    auth.value.user.id,
    id,
    invitationId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const PATCH = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const [{ id, invitationId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = UpdateInvitationRoleSchema.safeParse(body)
  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await InvitationService.updateRole(
    auth.value.user.id,
    id,
    invitationId,
    parsed.data.role,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
