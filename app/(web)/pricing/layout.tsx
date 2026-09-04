import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Planos e preços | Nexo',
  description:
    'Planos por assento, do essencial ao avançado, para times que querem simplificar a gestão de projetos e ganhar produtividade.',
  alternates: { canonical: '/pricing' },
}

export default function WebLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
