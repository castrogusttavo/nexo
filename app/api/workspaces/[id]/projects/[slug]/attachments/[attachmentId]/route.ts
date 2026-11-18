import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { ProjectAttachmentService } from '@/src/services/project-attachment.service'
import { handleError, successResponse } from '@/utils/http-response'

type Params = {
  params: Promise<{ id: string; slug: string; attachmentId: string }>
}

export const DELETE = withAxiom(async (_request: NextRequest, ctx: Params) => {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    'DELETE /api/workspaces/[id]/projects/[slug]/attachments/[attachmentId]',
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, attachmentId } = await ctx.params

  const result = await ProjectAttachmentService.remove(
    auth.value.user.id,
    id,
    slug,
    attachmentId,
  )
  if (!result.ok) return handleError(result.error)

  return successResponse(null)
})
