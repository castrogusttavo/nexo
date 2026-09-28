import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'

// Nothing under here can render before we know who is asking: this layout
// resolves the session and the consent gate and redirects when either is
// missing, and the workspace layout below adds the membership check. Cache
// Components validates every navigation for an instant, prerenderable shell
// and reports each of those reads on every dev page load. There is no honest
// static shell for a private workspace, so the segment declares that it blocks
// instead of leaving the dev overlay to repeat it forever — it was covering
// the page while screenshots were being taken.
//
// This is the proportionate fix, not the ambitious one. Making these routes
// genuinely instant means rendering the chrome from a cached shell and
// suspending the per-user parts behind skeletons, which is a UX change, not a
// bug fix.
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
