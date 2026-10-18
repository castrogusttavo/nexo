import { getIPFromHeader } from '@better-auth/core/utils/ip'
import { TRUSTED_PROXIES } from '@/lib/env/server'

// The address nginx actually saw: walk X-Forwarded-For from the right to the
// first hop that is not one of our proxies, the same resolution Better Auth
// uses (advanced.ipAddress in src/lib/auth.ts). The leftmost entry is written
// by the client, and nginx sets X-Real-IP from it, so neither is read.
function resolve(
  headers: Headers | null | undefined,
  ipv6Subnet: number,
): string | null {
  const forwardedFor = headers?.get('x-forwarded-for')
  if (!forwardedFor) return null

  return getIPFromHeader(forwardedFor, {
    trustedProxies: TRUSTED_PROXIES,
    ipv6Subnet,
  })
}

// The full address, for records (consent, applications). Better Auth
// truncates IPv6 to its /64 unless told otherwise, which is right for a rate
// limit key and wrong for evidence of who accepted the terms.
//
// null, not a placeholder: consent records store "we do not know" as no
// address at all.
export function clientIp(headers: Headers | null | undefined): string | null {
  return resolve(headers, 128)
}

// The /64 network, for rate limit keys: one subscriber usually owns a whole
// /64, so keying on it stops a client from rotating addresses inside it. The
// limiter maps null to 'unknown' itself (getClientIp).
export function clientIpBucket(
  headers: Headers | null | undefined,
): string | null {
  return resolve(headers, 64)
}
