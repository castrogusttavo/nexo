import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { auditAuth } from '@/lib/axiom/audit'
import { resolvePlatformAdmin } from '@/src/lib/admin-access'
import { getAuthSession } from '@/src/lib/auth-session'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const admin = await resolvePlatformAdmin()
  if (admin.ok) return <>{children}</>

  if (admin.error.code === 'UNAUTHORIZED') redirect('/sign-in')

  const session = await getAuthSession()
  const userId = session.ok ? session.value.user.id : null

  // A real admin who has not turned the second factor on is told so: the fix
  // is on their own account, and a 404 here would read as a broken deploy.
  if (admin.error.code === 'ADMIN_TWO_FACTOR_REQUIRED') {
    auditAuth({
      event: 'auth.admin_access.denied',
      userId,
      outcome: 'failure',
      reason: 'two_factor_required',
    })
    redirect('/?2fa=required')
  }

  // Everyone else gets the answer a made-up path gets. A redirect would
  // confirm the route exists and that the account merely lacks the rights,
  // which is a free hint to anyone probing.
  auditAuth({
    event: 'auth.admin_access.denied',
    userId,
    outcome: 'failure',
    reason: 'not_allowlisted',
  })
  notFound()
}
