import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { OnboardingService } from '@/src/services/onboarding.service'
import { OnboardingFormSkeleton } from '../_components/onboarding-form-skeleton'
import { onboardingDestination } from '../_lib/destination'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = {
  title: 'Seu perfil | Nexo',
}

// The title is the same for everyone and renders at once; the step check and
// the form wait for the session inside the boundary, so moving between steps
// never blocks on it.
export default function ProfileSetupPage() {
  return (
    <main className='mx-auto flex w-md max-w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Crie seu perfil</H1>
        <Muted>É assim que você vai aparecer no Nexo.</Muted>
      </header>
      <Suspense fallback={<OnboardingFormSkeleton />}>
        <ProfileStep />
      </Suspense>
    </main>
  )
}

async function ProfileStep() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const profileResult = await OnboardingService.getOnboardingProfile(
    auth.value.user.id,
  )
  if (!profileResult.ok) redirect('/sign-in')

  const profile = profileResult.value
  if (profile.onboardingStep !== 'PROFILE')
    redirect(await onboardingDestination(auth.value.user.id))

  return (
    <ProfileForm
      name={profile.name}
      image={profile.image}
      twoFactorEnabled={profile.twoFactorEnabled}
      hasPassword={profile.hasPassword}
    />
  )
}
