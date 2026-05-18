import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { UpdateUserSchema } from '@/src/schemas/user.schema'
import { UserService } from '@/src/services/user.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const result = await UserService.getProfile(auth.value.user.id)

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const PATCH = withAxiom(async (request: NextRequest) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const body = await request.json()
  const parsed = UpdateUserSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await UserService.updateProfile(
    auth.value.user.id,
    parsed.data,
  )

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
})

export const DELETE = withAxiom(async () => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const result = await UserService.deleteAccount(auth.value.user.id)

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value, 202)
})
