// Cookie that carries the user's decision on non-essential cookies
// (analytics/telemetry). Absence of the cookie = not decided yet → the
// banner shows and no tracker mounts. Value is read both server-side
// (initial render) and client-side (after the user clicks).

export const COOKIE_NAME = 'nx_cookie_consent'
// 1 year, matching the typical IAB TCF v2 expiry. The user can change
// the choice from the settings page at any time (Onda 6).
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export type CookieConsent = 'accepted' | 'rejected' | null

export function parseCookieConsent(value: string | undefined): CookieConsent {
  if (value === 'accepted' || value === 'rejected') return value
  return null
}
