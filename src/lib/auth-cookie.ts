import { getCookieCache } from 'better-auth/cookies'
import { BETTER_AUTH_SECRET, BETTER_AUTH_SECRETS } from '@/lib/env/server'

// Optimistic reads of Better Auth's signed cookie cache (session.cookieCache,
// 5 min) for proxy.ts: no database, so it can only ever route early. The
// definitive checks stay in the DAL (src/lib/dal.ts) and the API routes.
export type CookieConsent = 'consented' | 'missing' | 'unknown'

export const SESSION_DATA_COOKIE =
  /^(__Secure-)?better-auth\.session_data(\.\d+)?$/

// The compact cache is signed with ctx.context.secret, which Better Auth takes
// from the first BETTER_AUTH_SECRETS entry when that is set (create-context).
export function cookieCacheSecret(
  secrets: string | undefined,
  legacy: string,
): string {
  const first = secrets?.split(',')[0]?.trim()
  if (!first) return legacy
  return first.slice(first.indexOf(':') + 1).trim()
}

// `unknown` covers no cache, an expired one (every 5 min, the normal case) and
// a tampered on alike: getCookieCache returns null for all three, so none of
// them is a reason to block.
export async function readCookieConsent(
  request: Request,
  isSecure: boolean,
): Promise<CookieConsent> {
  try {
    const cache = await getCookieCache(request, {
      isSecure,
      secret: cookieCacheSecret(BETTER_AUTH_SECRETS, BETTER_AUTH_SECRET),
    })
    if (!cache) return 'unknown'

    const user = cache.user as {
      acceptedTermsAt?: unknown
      acceptedPrivacyAt?: unknown
    }
    return user.acceptedTermsAt && user.acceptedPrivacyAt
      ? 'consented'
      : 'missing'
  } catch {
    return 'unknown'
  }
}
