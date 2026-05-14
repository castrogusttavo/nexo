import type { Limiter } from '@/src/lib/rate-limit'
import { consume } from '@/src/lib/rate-limit'
import { handleError } from '@/utils/http-response'

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
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
