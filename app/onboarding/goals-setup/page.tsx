import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { OnboardingFormSkeleton } from '../_components/onboarding-form-skeleton'
import { onboardingDestination } from '../_lib/destination'
import { GoalsForm } from './goals-form'

export const metadata: Metadata = { title: 'Seus objetivos | Nexo' }

// Opted into instant-navigation validation (next.config.ts validates only
// segments that declare it): a blocking read here is a regression.
export const instant = true

// The title is the same for everyone and renders at once; the step check and
// the form wait for the session inside the boundary, so moving between steps
// never blocks on it.
export default function GoalsSetupPage() {
  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>O que te traz ao Nexo?</H1>
        <Muted>Conte-nos seus objetivos. Pode selecionar mais de um.</Muted>
      </header>
      <Suspense fallback={<OnboardingFormSkeleton />}>
        <GoalsStep />
      </Suspense>
    </main>
  )
}

async function GoalsStep() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'BRINGS')
    redirect(await onboardingDestination(auth.value.user.id))

  return <GoalsForm />
}
