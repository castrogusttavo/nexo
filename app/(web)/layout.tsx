import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WebHeader } from './_components/header/web-header'

export const metadata: Metadata = {
  title: 'Nexo — gestão de projetos nativa em IA',
  description:
    'Planos, blog e vagas do Nexo, a plataforma de gestão de projetos nativa em IA.',
}

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className='w-full h-dvh flex flex-col'>
      <WebHeader />
      <div className='flex-1 min-h-0'>{children}</div>
    </div>
  )
}
