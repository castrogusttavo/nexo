import type { Metadata } from 'next'

const TITLE = 'Recuperação de Desastres | Nexo'
const DESCRIPTION = 'Planos de recuperação e continuidade do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/disaster-recovery' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/disaster-recovery',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function DisasterRecoveryPage() {
  return <span>Recupação pós disastre</span>
}
