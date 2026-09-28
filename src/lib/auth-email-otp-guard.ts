import { APIError } from 'better-auth/api'
import { auditAuth } from '@/lib/axiom/audit'
import { isPlatformAdminEmail } from '@/lib/env/server-admin'
import { prisma } from '@/src/lib/prisma'

/** The slice of better-auth's context this rule reads, declared structurally
 *  so the rule can be tested without standing up an auth server. */
export interface EmailOtpGuardContext {
  path: string
  // `false` is what better-auth returns for a cookie whose signature does
  // not check out, which is as good as absent here.
  getSignedCookie: (
    name: string,
    secret: string,
  ) => Promise<string | false | undefined | null>
  context: {
    secret: string
    createAuthCookie: (name: string) => { name: string }
    internalAdapter: {
      findVerificationValue: (
        identifier: string,
      ) => Promise<{ value: string } | null | undefined>
      findUserById: (
        id: string,
      ) => Promise<{ id: string; email?: string | null } | null | undefined>
    }
  }
}

const GUARDED_PATHS = ['/two-factor/send-otp', '/two-factor/verify-otp']

async function hasVerifiedAuthenticator(userId: string): Promise<boolean> {
  const row = await prisma.twoFactor
    .findFirst({ where: { userId, verified: true }, select: { id: true } })
    .catch(() => null)
  return !!row
}

/**
 * Refuses the e-mailed second factor for a platform admin who has an
 * authenticator app enrolled.
 *
 * better-auth accepts an e-mailed code for any account with 2FA on, whatever
 * method was enrolled: `send-otp` asks only for a challenge in flight, not for
 * a matching factor. For a normal account that is a useful fallback. For an
 * account that can publish job posts and read candidate data it quietly undoes
 * what the authenticator was for — the whole point of TOTP is that a mailbox
 * is no longer enough, and as long as a code can be mailed, it is.
 *
 * Only an admin with a *verified* authenticator is refused. An admin whose one
 * factor is e-mail keeps it, because taking it away would be a lockout rather
 * than a hardening, and backup codes stay available to everyone.
 */
export async function refuseEmailOtpForAdminsWithTotp(
  ctx: EmailOtpGuardContext,
  hasAuthenticator: (
    userId: string,
  ) => Promise<boolean> = hasVerifiedAuthenticator,
): Promise<void> {
  if (!GUARDED_PATHS.includes(ctx.path)) return

  // Only the sign-in challenge carries this cookie. Enabling or disabling 2FA
  // happens with a live session and no challenge, and must not be touched.
  const cookie = ctx.context.createAuthCookie('two_factor')
  const identifier = await ctx.getSignedCookie(cookie.name, ctx.context.secret)
  if (!identifier) return

  const pending =
    await ctx.context.internalAdapter.findVerificationValue(identifier)
  if (!pending?.value) return

  const user = await ctx.context.internalAdapter.findUserById(pending.value)
  if (!isPlatformAdminEmail(user?.email)) return

  if (!(await hasAuthenticator(pending.value))) return

  auditAuth({
    event: 'auth.2fa.email_otp_refused',
    userId: pending.value,
    outcome: 'failure',
    reason: 'platform_admin_with_authenticator',
  })

  throw new APIError('BAD_REQUEST', {
    code: 'EMAIL_OTP_NOT_ALLOWED',
    message:
      'Esta conta usa aplicativo autenticador. Use o código do aplicativo ou um código de backup.',
  })
}
