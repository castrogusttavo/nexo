import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { forbidden } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { ProjectMediaService } from '@/src/services/media/project-media.service'
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

  const { id } = await ctx.params

  const membership = await MembershipRepository.findByUserAndWorkspace(
    auth.value.user.id,
    id,
  )
  if (!membership.ok) return handleError(membership.error)
  if (!membership.value) return handleError(forbidden())

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return standardError('VALIDATION_ERROR', 'Formulário inválido')
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return standardError('VALIDATION_ERROR', 'Arquivo não enviado')
  }

  const result = await ProjectMediaService.uploadCover({
    actorId: auth.value.user.id,
    workspaceId: id,
    contentType: file.type,
    byteSize: file.size,
    readBody: async () => Buffer.from(await file.arrayBuffer()),
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 201)
})
