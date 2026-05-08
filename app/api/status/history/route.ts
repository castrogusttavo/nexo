import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { apiLimiter } from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { StatusHistoryQuerySchema } from '@/src/schemas/status.schema'
import { StatusService } from '@/src/services/status/status.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(
  withRateLimit(
    (request) => ({ limiter: apiLimiter, key: `ip:${getClientIp(request)}` }),
    async (request: NextRequest) => {
      const url = new URL(request.url)
      const parsed = StatusHistoryQuerySchema.safeParse({
        componentKey: url.searchParams.get('componentKey') ?? undefined,
        days: url.searchParams.get('days') ?? undefined,
      })

      if (!parsed.success) {
        return standardError(
          'VALIDATION_ERROR',
          'Parâmetros inválidos',
          parsed.error.issues,
        )
      }

      const result = await StatusService.getHistory(
        parsed.data.componentKey,
        parsed.data.days,
      )
      if (!result.ok) return handleError(result.error)

      return successResponse(result.value, 200, undefined, {
        maxAge: 30,
        staleWhileRevalidate: 60,
      })
    },
  ),
)
