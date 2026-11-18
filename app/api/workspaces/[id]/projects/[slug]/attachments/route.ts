import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ProjectAttachmentService } from '@/src/services/project-attachment.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string }> }

export const GET = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id, slug } = await ctx.params

  const result = await ProjectAttachmentService.list(
    auth.value.user.id,
    id,
    slug,
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
    'POST /api/workspaces/[id]/projects/[slug]/attachments',
  )
  if (!consent.ok) return handleError(consent.error)

  const [{ id, slug }, formData] = await Promise.all([
    ctx.params,
    request.formData().catch(() => null),
  ])
  if (!formData) return standardError('VALIDATION_ERROR', 'Dados inválidos')

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return standardError('VALIDATION_ERROR', 'Envie um arquivo')
  }

  const result = await ProjectAttachmentService.upload(
    auth.value.user.id,
    id,
    slug,
    {
      buffer: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
      fileName: file.name,
    },
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
