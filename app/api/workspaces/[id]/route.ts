import type { NextRequest } from 'next/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { UpdateWorkspaceSchema } from '@/src/schemas/workspace.schema'
import { WorkspaceService } from '@/src/services/workspace.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const { id } = await params

  const result = await WorkspaceService.getById(auth.value.user.id, id)

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const { id } = await params

  const body = await request.json()
  const parsed = UpdateWorkspaceSchema.safeParse(body)

  if (!parsed.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Dados inválidos',
      parsed.error.issues,
    )
  }

  const result = await WorkspaceService.update(
    auth.value.user.id,
    id,
    parsed.data,
  )

  if (!result.ok) return handleError(result.error)

  return successResponse(result.value)
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const { id } = await params

  const result = await WorkspaceService.delete(auth.value.user.id, id)

  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
}
