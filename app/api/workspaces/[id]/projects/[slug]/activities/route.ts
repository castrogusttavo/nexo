import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ListActivityQuerySchema } from '@/src/schemas/activity.schema'
import { ActivityService } from '@/src/services/activity.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string }> }

export const GET = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug } = await ctx.params

  const parsed = ListActivityQuerySchema.safeParse({
    entityType: request.nextUrl.searchParams.get('entityType') ?? undefined,
    entityId: request.nextUrl.searchParams.get('entityId') ?? undefined,
  })

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await ActivityService.list(
    auth.value.user.id,
    id,
    slug,
    parsed.data.entityType,
    parsed.data.entityId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
