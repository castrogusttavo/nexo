import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { apiLimiter } from '@/src/lib/rate-limit'
import { getClientIp, withRateLimit } from '@/src/lib/rate-limit-helpers'
import { TalkToSalesSchema } from '@/src/schemas/talk-to-sales.schema'
import { TalkToSalesService } from '@/src/services/talk-to-sales.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const POST = withAxiom(
  withRateLimit(
    (request) => ({ limiter: apiLimiter, key: `ip:${getClientIp(request)}` }),
    async (request: NextRequest) => {
      const body = await request.json().catch(() => ({}))
      const parsed = TalkToSalesSchema.safeParse(body)

      if (!parsed.success) {
        return standardError(
          'VALIDATION_ERROR',
          'Dados inválidos',
          parsed.error.issues,
        )
      }

      const result = await TalkToSalesService.submit(parsed.data)
      if (!result.ok) return handleError(result.error)

      return successResponse({ received: true }, 201)
    },
  ),
)
