import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { forbidden } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectMediaService } from '@/src/services/media/project-media.service'
import { readUploadFile } from '@/utils/form-data'
import { handleError, successResponse } from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export const POST = withAxiom(async (request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const { id } = await ctx.params

  const membership = await MembershipRepository.findByUserAndWorkspace(
    auth.value.user.id,
    id,
  )
  if (!membership.ok) return handleError(membership.error)
  if (!membership.value) return handleError(forbidden())

  const file = await readUploadFile(request, 'file', {
    invalidBody: 'Formulário inválido',
    invalidFile: 'Arquivo não enviado',
  })
  if (!file.ok) return handleError(file.error)

  const result = await ProjectMediaService.uploadCover({
    actorId: auth.value.user.id,
    workspaceId: id,
    contentType: file.value.type,
    byteSize: file.value.size,
    readBody: async () => Buffer.from(await file.value.arrayBuffer()),
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
