import type { NextRequest } from 'next/server'
import { withAxiom } from '@/lib/axiom/server'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { UpdateEmojiSchema } from '@/src/schemas/update.schema'
import { ProjectReactionService } from '@/src/services/project-reaction.service'
import {
  handleError,
  standardError,
  successResponse,
} from '@/utils/http-response'

type Params = { params: Promise<{ id: string; slug: string; emoji: string }> }

function parseEmoji(raw: string) {
  try {
    return UpdateEmojiSchema.safeParse(decodeURIComponent(raw))
  } catch {
    return null
  }
}

async function handle(
  ctx: Params,
  method: 'PUT' | 'DELETE',
  run: typeof ProjectReactionService.react,
) {
  const auth = await getAuthSession()
  if (!auth.ok) return handleError(auth.error)

  const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
  if (!limit.ok) return handleError(limit.error)

  const consent = await requireConsent(
    auth.value.user.id,
    `${method} /api/workspaces/[id]/projects/[slug]/reactions/[emoji]`,
  )
  if (!consent.ok) return handleError(consent.error)

  const { id, slug, emoji } = await ctx.params
  const parsed = parseEmoji(emoji)
  if (!parsed?.success) {
    return standardError(
      'VALIDATION_ERROR',
      'Reação deve ser um único emoji',
      parsed?.error.issues,
    )
  }

  const result = await run(auth.value.user.id, id, slug, parsed.data)
  if (!result.ok) return handleError(result.error)

  return successResponse(null, 200)
}

export const PUT = withAxiom((_request: NextRequest, ctx: Params) =>
  handle(ctx, 'PUT', ProjectReactionService.react),
)

export const DELETE = withAxiom((_request: NextRequest, ctx: Params) =>
  handle(ctx, 'DELETE', ProjectReactionService.unreact),
)
