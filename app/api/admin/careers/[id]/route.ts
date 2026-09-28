import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { resolvePlatformAdmin } from '@/src/lib/admin-access'
import { UpdateCareerJobSchema } from '@/src/schemas/career-job.schema'
import { CareerJobService } from '@/src/services/career-job.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

export const GET = withAxiom(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const admin = await resolvePlatformAdmin()
    if (!admin.ok) return handleError(admin.error)

    const { id } = await params
    const result = await CareerJobService.getById(admin.value, id)
    if (!result.ok) return handleError(result.error)

    return successResponse(result.value)
  },
)

export const PATCH = withAxiom(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const admin = await resolvePlatformAdmin()
    if (!admin.ok) return handleError(admin.error)

    const [{ id }, body] = await Promise.all([
      params,
      request.json().catch(() => null),
    ])
    const parsed = UpdateCareerJobSchema.safeParse(body)
    if (!parsed.success) {
      return standardError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Dados inválidos',
        parsed.error.issues,
      )
    }

    const result = await CareerJobService.update(admin.value, id, parsed.data)
    if (!result.ok) return handleError(result.error)
    return successResponse(result.value, 201)
  },
)
