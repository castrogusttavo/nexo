import { getPlatformAdminEmails } from '@/lib/env/server-admin'
import { adminTwoFactorRequired, forbidden, unauthorized } from '@/src/errors'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { err, ok, type Result } from '@/src/lib/result'
import type { PlatformActor } from '@/src/services/career-job.service'

/**
 * Resolves who is asking and whether they may use the platform admin
 * surfaces, with the second factor confirmed against the database.
 *
 * The session is served from better-auth's cookie cache for up to five
 * minutes, user row included. Reading `twoFactorEnabled` straight off it
 * therefore has a window where someone who just turned 2FA on is still told
 * to turn 2FA on — the one message guaranteed to look broken to the person
 * who did exactly what was asked. So a session that claims *no* second factor
 * is checked against the row before anyone is refused; a session that claims
 * one is believed, because the cache cannot invent it.
 *
 * Callers get the actor to hand to the services, which own the authorization
 * proper (see `CareerJobService.assertPlatformAdmin`). The checks here are
 * the same ones, run early so a page or a route handler can answer without
 * reaching a service at all.
 */
export async function resolvePlatformAdmin(): Promise<Result<PlatformActor>> {
  const session = await getAuthSession()
  if (!session.ok) return err(unauthorized())

  const user = session.value.user
  const email = user.email?.toLowerCase()
  if (!email || !getPlatformAdminEmails().includes(email)) {
    return err(forbidden())
  }

  // The allowlist names addresses, so an address the account never proved it
  // owns must not count. Sign-in already requires a verified e-mail, which
  // makes this redundant today — and redundant is the point: it is the check
  // that survives someone loosening that requirement later.
  if (!user.emailVerified) return err(forbidden())

  if (user.twoFactorEnabled) {
    return ok({ id: user.id, email, twoFactorEnabled: true })
  }

  const fresh = await prisma.user
    .findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true } })
    .catch(() => null)

  if (!fresh?.twoFactorEnabled) return err(adminTwoFactorRequired())

  return ok({ id: user.id, email, twoFactorEnabled: true })
}
