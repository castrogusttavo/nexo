import { apiLimiter } from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { StatusService } from '@/src/services/status/status.service'
import { handleError, successResponse } from '@/utils/http-response'

export const GET = withRateLimit(
  (request) => ({ limiter: apiLimiter, key: `ip:${getClientIp(request)}` }),
  async () => {
    const result = await StatusService.getCurrentSnapshot()
    if (!result.ok) return handleError(result.error)

    return successResponse(result.value, 200, undefined, {
      maxAge: 30,
      staleWhileRevalidate: 60,
    })
  },
)
