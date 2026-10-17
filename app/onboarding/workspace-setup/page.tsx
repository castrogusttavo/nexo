import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { OnboardingFormSkeleton } from '../_components/onboarding-form-skeleton'
import { onboardingDestination } from '../_lib/destination'
import { WorkspaceForm } from './workspace-form'

export const metadata: Metadata = { title: 'Criar workspace | Nexo' }

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

// The title is the same for everyone and renders at once; the step check and
// the form wait for the session inside the boundary, so moving between steps
// never blocks on it.
export default function WorkspaceSetupPage() {
  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Crie seu workspace</H1>
        <Muted>Todo o seu trabalha - em um só lugar</Muted>
      </header>
      <Suspense fallback={<OnboardingFormSkeleton />}>
        <WorkspaceStep />
      </Suspense>
    </main>
  )
}

async function WorkspaceStep() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'WORKSPACE')
    redirect(await onboardingDestination(auth.value.user.id))

  return <WorkspaceForm />
}
