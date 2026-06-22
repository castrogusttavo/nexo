import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HeaderOnboarding } from '@/app/_components/header/onboarding/header-onboarding'

export const metadata: Metadata = {
  title: 'Configuração | Nexo',
}

export default function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className='min-h-screen flex flex-col bg-background'>
      <HeaderOnboarding />
      <div className='flex-1 flex items-center justify-center'>{children}</div>
    </div>
  )
}
