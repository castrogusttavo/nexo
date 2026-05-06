import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/src/lib/auth'
import { authLimiter, consume } from '@/src/lib/rate-limit'
import { getClientIp } from '@/src/lib/rate-limit-helpers'
import { handleError } from '@/utils/http-response'

const PROTECTED_AUTH_PREFIXES = [
  '/api/auth/sign-in/',
  '/api/auth/sign-up/',
  '/api/auth/two-factor/',
  '/api/auth/forget-password',
  '/api/auth/reset-password',
  '/api/auth/email-otp/',
] as const

function shouldRateLimit(pathname: string): boolean {
  return PROTECTED_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

const handler = toNextJsHandler(auth)

export async function GET(request: Request) {
  return handler.GET(request)
}

export async function POST(request: Request) {
  const pathname = new URL(request.url).pathname
  if (shouldRateLimit(pathname)) {
    const ip = getClientIp(request)
    const result = await consume(authLimiter, `${ip}:${pathname}`)
    if (!result.ok) return handleError(result.error)
  }
  return handler.POST(request)
}
