import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { EmbedMetadataService } from '@/src/services/embed-metadata.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string }> }

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug } = await ctx.params
  const body = await request.json().catch(() => null)
  if (typeof body?.url !== 'string') {
    return standardError('VALIDATION_ERROR', 'URL é obrigatória')
  }

  const result = await EmbedMetadataService.resolve(
    auth.value.user.id,
    id,
    slug,
    body.url,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
