import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { UserService } from '@/src/services/user.service'
import { GoalsForm } from './goals-form'

export const metadata: Metadata = { title: 'Seus objetivos | Nexo' }

export default async function GoalsSetupPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserService.getProfile(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  if (userResult.value.onboardingStep !== 'BRINGS') redirect('/onboarding')

  return (
    <main className='mx-auto flex max-w-md w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>O que te traz ao Nexo?</H1>
        <Muted>Conte-nos seus objetivos. Pode selecionar mais de um.</Muted>
      </header>
      <GoalsForm />
    </main>
  )
}
