import { getIPFromHeader } from '@better-auth/core/utils/ip'
import { TRUSTED_PROXIES } from '@/lib/env/server'
import type { Limiter } from '@/src/lib/rate-limit'
import { consume } from '@/src/lib/rate-limit'
import { handleError } from '@/utils/http-response'

// Same resolution as Better Auth's own limiter (see advanced.ipAddress in
// src/lib/auth.ts): walk X-Forwarded-For from the right to the first
// untrusted hop. The leftmost entry is client-controlled, and X-Real-IP is
// set from it by nginx, so neither is read.
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (!forwardedFor) return 'unknown'

  return (
    getIPFromHeader(forwardedFor, { trustedProxies: TRUSTED_PROXIES }) ??
    'unknown'
  )
}

type RateLimitTarget = { limiter: Limiter; key: string; points?: number }

export type RateLimitResolver<TReq extends Request, TArgs extends unknown[]> = (
  request: TReq,
  ...args: TArgs
) => RateLimitTarget | null | Promise<RateLimitTarget | null>

export function withRateLimit<TReq extends Request, TArgs extends unknown[]>(
  resolver: RateLimitResolver<TReq, TArgs>,
  handler: (request: TReq, ...args: TArgs) => Promise<Response> | Response,
) {
  return async (request: TReq, ...args: TArgs): Promise<Response> => {
    const target = await resolver(request, ...args)
    if (target) {
      const result = await consume(target.limiter, target.key, target.points)
      if (!result.ok) return handleError(result.error)
    }
    return handler(request, ...args)
  }
}
