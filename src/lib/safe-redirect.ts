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
