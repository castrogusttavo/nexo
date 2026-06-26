import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { consume, uploadLimiter } from '@/src/lib/rate-limit'
import { UserMediaService } from '@/src/services/media/user-media.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const POST = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(uploadLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return standardError('VALIDATION_ERROR', 'Corpo da requisição inválido')
  }

  const file = formData.get('cover')
  if (!(file instanceof File))
    return standardError('VALIDATION_ERROR', 'Arquivo inválido')

  const result = await UserMediaService.uploadCover({
    userId: auth.value.user.id,
    contentType: file.type,
    byteSize: file.size,
    readBody: async () => Buffer.from(await file.arrayBuffer()),
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
