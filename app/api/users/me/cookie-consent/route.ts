import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { ConsentService } from '@/src/services/consent.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

const BodySchema = z.object({ accepted: z.boolean() })

export const POST = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const body = await request.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Body inválido',
      parsed.error.issues,
    )
  }

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') ?? null

  const result = await ConsentService.recordCookieConsent(
    auth.value.user.id,
    parsed.data.accepted,
    { ipAddress, userAgent },
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})
