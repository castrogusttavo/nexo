/**
 * Where a signed-in user goes when no other destination was asked for. Not
 * `/`: the root is a static marketing page, and a client-side navigation to it
 * after signing in would show the prerendered page instead of passing through
 * proxy.ts. `/home` resolves the user's workspace on the server.
 */
export const SIGNED_IN_HOME = '/home'

/**
 * Validates a redirect destination coming from a query string (`?redirect=`).
 * Accepts only paths relative to the app itself — blocks open redirect
 * (`https://…`, `//host`, `/\host`). Returns `null` when invalid.
 */
export function safeRedirectPath(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
