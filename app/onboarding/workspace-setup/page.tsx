import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { WorkspaceForm } from './workspace-form'

export const metadata: Metadata = { title: 'Criar workspace | Nexo' }

export default async function WorkspaceSetupPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'WORKSPACE') redirect('/onboarding')

  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Crie seu workspace</H1>
        <Muted>Todo o seu trabalha - em um só lugar</Muted>
      </header>
      <WorkspaceForm />
    </main>
  )
}
