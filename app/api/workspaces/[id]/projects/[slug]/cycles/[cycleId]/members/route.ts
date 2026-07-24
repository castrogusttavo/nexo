import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { AddCycleMemberSchema } from '@/src/schemas/cycle-member.schema'
import { CycleService } from '@/src/services/cycle.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string; cycleId: string }> }

export const GET = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug, cycleId } = await ctx.params

  const result = await CycleService.listMembers(
    auth.value.user.id,
    id,
    slug,
    cycleId,
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
    'POST /api/workspaces/[id]/projects/[slug]/cycles/[cycleId]/members',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, cycleId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = AddCycleMemberSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await CycleService.addMember(
    auth.value.user.id,
    id,
    slug,
    cycleId,
    parsed.data.userId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
