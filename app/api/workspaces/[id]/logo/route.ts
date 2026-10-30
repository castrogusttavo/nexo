import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { consume, uploadLimiter } from '@/src/lib/rate-limit'
import { WorkspaceMediaService } from '@/src/services/media/workspace-media.service'
import { readUploadFile } from '@/utils/form-data'
import { handleError, successResponse } from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(uploadLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'POST /api/workspaces/[id]/logo',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id } = await ctx.params

  const file = await readUploadFile(request, 'logo', {
    invalidBody: 'Formulário inválido',
    invalidFile: 'Arquivo não enviado',
  })
  if (!file.ok) return handleError(file.error)

  const result = await WorkspaceMediaService.uploadLogo({
    actorId: auth.value.user.id,
    workspaceId: id,
    contentType: file.value.type,
    byteSize: file.value.size,
    readBody: async () => Buffer.from(await file.value.arrayBuffer()),
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})

export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(uploadLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'DELETE /api/workspaces/[id]/logo',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id } = await ctx.params

  const result = await WorkspaceMediaService.removeLogo(auth.value.user.id, id)
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
})
