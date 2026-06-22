import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { H1 } from '@/components/typography/heading/h1'
import { Muted } from '@/components/typography/text/muted'
import { getAuthSession } from '@/src/lib/auth-session'
import { prisma } from '@/src/lib/prisma'
import { UserRepository } from '@/src/repositories/user.repository'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = {
  title: 'Seu perfil | Nexo',
}

export default async function ProfileSetupPage() {
  const auth = await getAuthSession()
  if (!auth.ok) redirect('/sign-in')

  const userResult = await UserRepository.findById(auth.value.user.id)
  if (!userResult.ok) redirect('/sign-in')

  const user = userResult.value
  if (user.onboardingStep !== 'PROFILE') redirect('/onboarding')

  const credentialAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: 'credential' },
    select: { password: true },
  })
  const hasPassword = !!credentialAccount?.password

  return (
    <main className='mx-auto flex w-md max-w-md flex-col gap-6 px-6 py-16'>
      <header className='flex flex-col gap-2'>
        <H1 className='text-left'>Crie seu perfil</H1>
        <Muted>É assim que você vai aparecer no Nexo.</Muted>
      </header>
      <ProfileForm
        name={user.name}
        image={user.image}
        twoFactorEnabled={user.twoFactorEnabled}
        hasPassword={hasPassword}
      />
    </main>
  )
}
