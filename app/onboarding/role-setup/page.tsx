import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserRepository } from '@/src/repositories/user.repository'
import { RoleForm } from './role-form'

export const metadata: Metadata = { title: 'Sua função | Nexo' }

export default async function RoleSetupPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserRepository.findById(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'ROLE') redirect('/onboarding')

  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Qual é a sua função?</H1>
        <Muted>Vamos configurar o Nexo do jeito que você trabalha.</Muted>
      </header>
      <RoleForm />
    </main>
  )
}
