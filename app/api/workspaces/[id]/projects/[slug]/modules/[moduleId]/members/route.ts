import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { AddModuleMemberSchema } from '@/src/schemas/module-member.schema'
import { ModuleService } from '@/src/services/module.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; slug: string; moduleId: string }>
}

export const GET = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug, moduleId } = await ctx.params

  const result = await ModuleService.listMembers(
    auth.value.user.id,
    id,
    slug,
    moduleId,
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
    'POST /api/workspaces/[id]/projects/[slug]/modules/[moduleId]/members',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug, moduleId }, body] = await Promise.all([
    ctx.params,
    request.json(),
  ])
  const parsed = AddModuleMemberSchema.safeParse(body)
  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await ModuleService.addMember(
    auth.value.user.id,
    id,
    slug,
    moduleId,
    parsed.data.userId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
