import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { resolvePlatformAdmin } from '@/src/lib/admin-access'
import { ChangeCareerJobStatusSchema } from '@/src/schemas/career-job.schema'
import { CareerJobService } from '@/src/services/career-job.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

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
    const parsed = ChangeCareerJobStatusSchema.safeParse(body)
    if (!parsed.success) {
      return standardError(
        'VALIDATION_ERROR',
        'Dados inválidos',
        parsed.error.issues,
      )
    }

    const result = await CareerJobService.changeStatus(
      admin.value,
      id,
      parsed.data,
    )
    if (!result.ok) return handleError(result.error)
    return successResponse(result.value, 201)
  },
)
