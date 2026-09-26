import { auditAuth } from '@/lib/axiom/audit'
import { isPlatformAdminEmail } from '@/lib/env/server-admin'

/**
 * The slice of better-auth's endpoint context this rule needs. Declared
 * structurally so the rule can be tested without standing up an auth server.
 */
export interface TrustedDeviceContext {
  path: string
  context: {
    newSession?: { user: { id: string; email?: string | null } } | null
    createAuthCookie: (
      name: string,
      options: { maxAge: number },
    ) => { name: string; attributes: Record<string, unknown> }
  }
  setCookie: (
    name: string,
    value: string,
    attributes: Record<string, unknown>,
  ) => void
}

/**
 * Drops the trusted-device cookie when the account that just cleared a second
 * factor is a platform admin.
 *
 * Trusting a device lets the next sign-in skip the second factor for 30 days.
 * That is a fair trade for a normal account and a bad one for an account that
 * can publish job posts and read candidate data: it turns a stolen laptop, or
 * a copied cookie jar, into standing admin access.
 *
 * The refusal happens here, after verification, rather than by hiding the
 * checkbox: the sign-in page cannot know whether the pending user is an admin
 * without being told, and telling it would leak the admin list to anyone who
 * reaches the password step.
 */
export async function refuseTrustedDeviceForAdmins(
  ctx: TrustedDeviceContext,
): Promise<void> {
  if (!ctx.path.startsWith('/two-factor/verify')) return

  const user = ctx.context.newSession?.user
  if (!isPlatformAdminEmail(user?.email)) return

  const cookie = ctx.context.createAuthCookie('trust_device', { maxAge: 0 })
  ctx.setCookie(cookie.name, '', { ...cookie.attributes, maxAge: 0 })

  auditAuth({
    event: 'auth.2fa.trust_device_refused',
    userId: user?.id,
    meta: { reason: 'platform_admin' },
  })
}
