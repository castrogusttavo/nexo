import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'

// Nothing under here can render before we know who is asking: this layout
// resolves the session and the consent gate and redirects when either is
// missing, and the workspace layout below adds the membership check, so the
// private app blocks by design. next.config.ts validates instant navigation
// only where a segment opts in; `instant = false` here also keeps the static
// shell check off for this tree (prerendering it hits Better Auth's
// `new Date()` in the session read).
//
// Do not wrap the gate in <Suspense> to quiet the dev overlay: the page would
// render before the check finishes. The way out is moving the checks out of
// render (see the plan in the vault, 2026-10-16-instant-private-app-plan).
export const instant = false

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  // SECURITY GATE (STR-61 ) - do not remove or weaken.
  // Every authenticated path under (private) requires accepted Terms + Policy.
  // requiresConsent() is the SAME gate enforced on the API mutation routes:
  // keeping both in sync prevents the "UI blocked, API open" bypass. It also
  // audits the blocked attempt (Axiom). Covers OAuth signup (which skips the
  // checkbox) and any direct-URL bypass.
  const consent = await requireConsent(session.value.user.id, 'page:(private)')
  if (!consent.ok) redirect('/onboarding/consent-setup')

  return <>{children}</>
}
