import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { OnboardingFormSkeleton } from '../_components/onboarding-form-skeleton'
import { onboardingDestination } from '../_lib/destination'
import { ConsentForm } from './consent-form'

export const metadata: Metadata = {
  title: 'Aceite de termos | Nexo',
  description:
    'Aceite os Termos de Serviço e a Política de Privacidade para continuar usando o Nexo.',
}

// Opted into instant-navigation validation (next.config.ts validates only
// segments that declare it): a blocking read here is a regression.
export const instant = true

// The copy is the same for everyone and renders at once; the check for who is
// asking (and whether they already accepted) waits inside the boundary, so the
// step never blocks on it.
export default function OnboardingConsentPage() {
  return (
    <main className='mx-auto flex max-w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Quase lá</H1>
        <Muted>
          Para continuar, leia e aceite nossos documentos. Você só vê esta tela
          uma vez.
        </Muted>
      </header>

      <P className='mt-0 text-sm'>
        Marque ambas as caixas após ler os documentos. Os links abrem em uma
        nova aba.
      </P>

      <Suspense fallback={<OnboardingFormSkeleton />}>
        <ConsentStep />
      </Suspense>
    </main>
  )
}

async function ConsentStep() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.acceptedTermsAt && userResult.value.acceptedPrivacyAt) {
    redirect(await onboardingDestination(auth.value.user.id))
  }

  return <ConsentForm />
}
