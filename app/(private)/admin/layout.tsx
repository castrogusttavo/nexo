import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { getPlatformAdminEmails } from '@/lib/env/server-admin'
import { getAuthSession } from '@/src/lib/auth-session'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in')

  const email = session.value.user.email?.toLowerCase()
  if (!email || !getPlatformAdminEmails().includes(email)) {
    redirect('/')
  }

  return <>{children}</>
}
