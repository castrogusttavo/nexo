import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserRepository } from '@/src/repositories/user.repository'

export default async function PrivateLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  // Consent gate: any authenticated path under (private) requires
  // accepted terms + privacy. Covers OAuth signup (which skips the
  // checkbox form) and any curl-bypass of the email signup. Failure
  // to load the user is treated as no-consent — safer to over-prompt
  // than to silently let an unconsented user through.
  const user = await UserRepository.findById(session.value.user.id)
  if (
    !user.ok ||
    !user.value.acceptedTermsAt ||
    !user.value.acceptedPrivacyAt
  ) {
    redirect('/onboarding/consent')
  }

  return <>{children}</>
}
