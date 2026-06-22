import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { requireConsent } from '@/src/lib/consent'

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
