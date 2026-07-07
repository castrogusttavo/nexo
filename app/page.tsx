import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { WebHeader } from '@/app/(web)/_components/header/web-header'
import { auth } from '@/src/lib/auth'
import { MembershipRepository } from '@/src/repositories/membership.repository'

export const metadata: Metadata = {
  title: 'Nexo',
  description: 'AI-native project management.',
}

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (session) {
    const memberships = await MembershipRepository.listByUser(session.user.id)
    if (memberships.ok && memberships.value.length > 0) {
      redirect(`/${memberships.value[0].workspace.slug}`)
    }
    redirect('/onboarding')
  }

  // Deslogado: serve o site de marketing na raiz
  return (
    <div className='h-full w-full'>
      <WebHeader />
      <h1>Hello nexo</h1>
    </div>
  )
}
