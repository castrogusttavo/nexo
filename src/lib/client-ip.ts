import { getIPFromHeader } from '@better-auth/core/utils/ip'
import { TRUSTED_PROXIES } from '@/lib/env/server'

// The address nginx actually saw: walk X-Forwarded-For from the right to the
// first hop that is not one of our proxies, the same resolution Better Auth
// uses (advanced.ipAddress in src/lib/auth.ts). The leftmost entry is written
// by the client, and nginx sets X-Real-IP from it, so neither is read.
//
// null, not a placeholder: consent records store "we do not know" as no
// address at all. The rate limiter's key needs a string and maps null to
// 'unknown' itself (getClientIp).
export function clientIp(headers: Headers | null | undefined): string | null {
  const forwardedFor = headers?.get('x-forwarded-for')
  if (!forwardedFor) return null

  return getIPFromHeader(forwardedFor, { trustedProxies: TRUSTED_PROXIES })
}
