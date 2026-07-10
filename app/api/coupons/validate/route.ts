import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ValidateCouponSchema } from '@/src/schemas/coupon.schema'
import { CouponService } from '@/src/services/coupon.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const parsed = ValidateCouponSchema.safeParse({
    code: request.nextUrl.searchParams.get('code') ?? undefined,
  })

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Cupom inválido',
      parsed.error.issues,
    )
  }

  const result = await CouponService.validate(parsed.data)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
