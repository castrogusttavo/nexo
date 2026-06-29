import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { consume, uploadLimiter } from '@/src/lib/rate-limit'
import { UserMediaService } from '@/src/services/media/user-media.service'
import { readUploadFile } from '@/utils/form-data'
import { handleError, successResponse } from '@/utils/http-response'

export const POST = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(uploadLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const file = await readUploadFile(request, 'cover')
  if (!file.ok) return handleError(file.error)

  const result = await UserMediaService.uploadAvatar({
    userId: auth.value.user.id,
    contentType: file.value.type,
    byteSize: file.value.size,
    readBody: async () => Buffer.from(await file.value.arrayBuffer()),
  })
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
