import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { CreateCareerJobSchema } from '@/src/schemas/career-job.schema'
import { CareerJobService } from '@/src/services/career-job.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async () => {
  const session = await getAuthSession()
  if (!session.ok) return handleError(session.error)

  const result = await CareerJobService.listAll(session.value.user.email)
  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const POST = withAxiom(async (request: NextRequest) => {
  const session = await getAuthSession()
  if (!session.ok) return handleError(session.error)

  const body = await request.json().catch(() => null)
  const parsed = CreateCareerJobSchema.safeParse(body)
  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      parsed.error.issues[0]?.message ?? 'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await CareerJobService.create(
    session.value.user.id,
    session.value.user.email,
    parsed.data,
  )
  if (!result.ok) return handleError(result.error)
  return successResponse(result.value, 201)
})
