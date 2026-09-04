import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const TITLE = 'Planos e preços | Nexo'
const DESCRIPTION =
  'Planos por assento, do essencial ao avançado, para times que querem simplificar a gestão de projetos e ganhar produtividade.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    url: '/pricing',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function WebLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
