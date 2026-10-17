import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { OnboardingFormSkeleton } from '../_components/onboarding-form-skeleton'
import { onboardingDestination } from '../_lib/destination'
import { RoleForm } from './role-form'

export const metadata: Metadata = { title: 'Sua função | Nexo' }

// Navigations into this page are instant: a blocking read here is a
// regression the dev overlay reports.
export const instant = true

// The title is the same for everyone and renders at once; the step check and
// the form wait for the session inside the boundary, so moving between steps
// never blocks on it.
export default function RoleSetupPage() {
  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Qual é a sua função?</H1>
        <Muted>Vamos configurar o Nexo do jeito que você trabalha.</Muted>
      </header>
      <Suspense fallback={<OnboardingFormSkeleton />}>
        <RoleStep />
      </Suspense>
    </main>
  )
}

async function RoleStep() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'ROLE')
    redirect(await onboardingDestination(auth.value.user.id))

  return <RoleForm />
}
