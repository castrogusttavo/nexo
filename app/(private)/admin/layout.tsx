import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auditAuth } from '@/lib/axiom/audit'
import { getPlatformAdminEmails } from '@/lib/env/server-admin'
import { getAuthSession } from '@/src/lib/auth-session'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const user = session.value.user
  const email = user.email?.toLowerCase()

  // 404, not a redirect home: a redirect confirms the route exists and that
  // the account merely lacks the rights, which is a free hint to anyone
  // probing. To everyone outside the allowlist this surface simply is not
  // there — the same answer a made-up path gets.
  if (!email || !getPlatformAdminEmails().includes(email)) {
    auditAuth({
      event: 'auth.admin_access.denied',
      userId: user.id,
      outcome: 'failure',
      reason: 'not_allowlisted',
    })
    notFound()
  }

  // A real admin with no second factor gets the opposite treatment: say what
  // is wrong, because the fix is on their own account and a 404 here would
  // read as a broken deploy.
  if (!user.twoFactorEnabled) {
    auditAuth({
      event: 'auth.admin_access.denied',
      userId: user.id,
      outcome: 'failure',
      reason: 'two_factor_required',
    })
    redirect('/?2fa=required')
  }

  return <>{children}</>
}
