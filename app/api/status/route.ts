import { StatusService } from '@/src/services/status/status.service'
import { handleError, successResponse } from '@/utils/http-response'

export async function GET() {
  const result = await StatusService.getCurrentSnapshot()
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 200, undefined, {
    maxAge: 30,
    staleWhileRevalidate: 60,
  })
}
