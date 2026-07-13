import type { NextRequest } from 'next/server'
import type { ZodType, z } from 'zod'
import { withAxiom } from '@/lib/axiom/server'
import type { AppError } from '@/src/errors/app-error'
import { validationError } from '@/src/errors/app-error'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'
import { apiLimiter, consume } from '@/src/lib/rate-limit'
import { err, type Result } from '@/src/lib/result'
import { handleError, successResponse } from './http-response'

export interface AuthedRouteContext {
  request: NextRequest
  userId: string
}

export interface AuthedRouteOptions {
  successStatus?: number
  // Resource label passed to requireConsent (e.g. 'page:(private)').
  // Omit to skip the consent gate.
  consentResource?: string
}

// Wraps the auth -> rate-limit -> (optional consent) -> handler -> response
// sequence shared by every authenticated API route. `handler` just returns
// a Result; this takes care of turning it into the HTTP response.
export function withAuthenticatedRoute<T>(
  handler: (ctx: AuthedRouteContext) => Promise<Result<T, AppError>>,
  options: AuthedRouteOptions = {},
) {
  return withAxiom(async (request: NextRequest) => {
    const auth = await getAuthSession()
    if (!auth.ok) return handleError(auth.error)

    const limit = await consume(apiLimiter, `user:${auth.value.user.id}`)
    if (!limit.ok) return handleError(limit.error)

    if (options.consentResource) {
      const consent = await requireConsent(
        auth.value.user.id,
        options.consentResource,
      )
      if (!consent.ok) return handleError(consent.error)
    }

    const result = await handler({ request, userId: auth.value.user.id })
    if (!result.ok) return handleError(result.error)

    return successResponse(result.value, options.successStatus ?? 200)
  })
}

// Same as `withAuthenticatedRoute`, but also parses/validates the JSON body
// against `schema` first, matching the create-a-resource shape.
export function withValidatedBody<TSchema extends ZodType, T>(
  schema: TSchema,
  handler: (
    ctx: AuthedRouteContext & { data: z.infer<TSchema> },
  ) => Promise<Result<T, AppError>>,
  options: AuthedRouteOptions = {},
) {
  return withAuthenticatedRoute(async (ctx) => {
    const body = await ctx.request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return err(validationError('Dados inválidos', parsed.error.issues))
    }

    return handler({ ...ctx, data: parsed.data })
  }, options)
}
