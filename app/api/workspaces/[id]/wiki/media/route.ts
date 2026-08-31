import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { WikiMediaService } from '@/src/services/wiki-media.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'POST /api/workspaces/[id]/wiki/media',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id }, formData] = await Promise.all([
    ctx.params,
    request.formData().catch(() => null),
  ])
  if (!formData) return standardError('VALIDATION_ERROR', 'Dados inválidos')

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return standardError('VALIDATION_ERROR', 'Envie um arquivo')
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const result = await WikiMediaService.upload(auth.value.user.id, id, {
    buffer,
    contentType: file.type,
    fileName: file.name,
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})

export const GET = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id } = await ctx.params
  const key = request.nextUrl.searchParams.get('key')
  if (!key)
    return standardError('VALIDATION_ERROR', 'Parâmetro key é obrigatório')

  const result = await WikiMediaService.getDownloadUrl(
    auth.value.user.id,
    id,
    key,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
