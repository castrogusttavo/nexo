import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getAuthSession } from '@/src/lib/auth-session'
import { AcceptInvitation } from './accept-invitation'

export const metadata: Metadata = {
  title: 'Aceitar convite | Nexo',
  description: 'Aceite seu convite para um workspace no Nexo.',
  robots: { index: false, follow: false },
}

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

type SearchParams = Promise<{ token?: string }>

// Who is asking and which token they carry decide where this goes, so all of
// it waits inside the boundary.
export default function InviteAcceptPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense>
      <InviteAccept searchParams={searchParams} />
    </Suspense>
  )
}

async function InviteAccept({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams
  if (!token) redirect('/sign-in')

  const auth = await getAuthSession()
  if (!auth.ok) {
    const callback = encodeURIComponent(`/invite/accept?token=${token}`)
    redirect(`/sign-up?redirect=${callback}`)
  }

  return <AcceptInvitation token={token} />
}
