import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { P } from '@/components/typography/text/p'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserRepository } from '@/src/repositories/user.repository'
import { ConsentForm } from './consent-form'

export const metadata: Metadata = {
  title: 'Aceite de termos | Nexo',
  description:
    'Aceite os Termos de Serviço e a Política de Privacidade para continuar usando o Nexo.',
}

export default async function OnboardingConsentPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserRepository.findById(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.acceptedTermsAt && userResult.value.acceptedPrivacyAt) {
    redirect('/')
  }

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

      <ConsentForm />
    </main>
  )
}
