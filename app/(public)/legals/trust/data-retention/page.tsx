import type { Metadata } from 'next'

const TITLE = 'Retenção de Dados | Nexo'
const DESCRIPTION = 'Por quanto tempo o Nexo retém seus dados.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/data-retention' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/data-retention',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/opengraph-image'],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/twitter-image'],
  },
}

export default function DataRentetionPage() {
  return <span>Retenção de dados</span>
}
