import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { AcceptInvitation } from './accept-invitation'

type Props = { searchParams: Promise<{ token?: string }> }

export default async function InviteAcceptPage({ searchParams }: Props) {
  const { token } = await searchParams
  if (!token) redirect('/sign-in')

  const auth = await getAuthSession()
  if (!auth.ok) {
    const callback = encodeURIComponent(`/invite/accept?token=${token}`)
    redirect(`/sign-up?redirect=${callback}`)
  }

  return <AcceptInvitation token={token} />
}
