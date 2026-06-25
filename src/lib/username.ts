import { createId } from '@paralleldrive/cuid2'

const SANITIZE = /[^a-z0-9._-]/g
/**
 * Default username = everything before the "@" of the email,
 * lowercased and stripped of disallowed chareacters. Works the same
 * for gmail, outlook, or any provider. Falls back to "user" when the
 * local-part sanitizes to fewer than 3 chars.
 */
export function deriveUsernameBase(email: string): string {
  const local = email.split('@')[0] ?? ''
  const sanitized = local.toLowerCase().replace(SANITIZE, '')
  return sanitized.length >= 3 ? sanitized : 'user'
}

/**
 * Resolve a unique username from an email, appending a numeric suffix
 * (then a random one as a last resort) when the base is already taken.
 */
export async function generateUniqueUsername(
  email: string,
  isTaken: (username: string) => Promise<boolean>,
): Promise<string> {
  const base = deriveUsernameBase(email)
  if (!(await isTaken(base))) return base

  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}${i}`
    if (!(await isTaken(candidate))) return candidate
  }

  return `${base}${createId().slice(0, 8)}`
}
