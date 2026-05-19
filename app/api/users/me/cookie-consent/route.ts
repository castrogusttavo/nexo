import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { auditMutation } from '@/lib/axiom/audit'
import { withAxiom } from '@/lib/axiom/server'
import { COOKIES_VERSION } from '@/lib/legal/versions'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
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

  const userId = auth.value.user.id
  const action = parsed.data.accepted ? 'GRANTED' : 'REVOKED'

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  const userAgent = request.headers.get('user-agent') ?? null

  await prisma.consentEvent.create({
    data: {
      userId,
      document: 'COOKIES',
      version: COOKIES_VERSION,
      action,
      ipAddress,
      userAgent,
    },
  })

  auditMutation({
    entity: 'consent',
    action: parsed.data.accepted ? 'grant' : 'revoke',
    actorId: userId,
    targetId: userId,
    meta: { document: 'COOKIES', version: COOKIES_VERSION, source: 'banner' },
  })

  return successResponse({ accepted: parsed.data.accepted })
})
