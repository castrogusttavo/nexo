import type { Metadata } from 'next'

const TITLE = 'Controle de Acesso | Nexo'
const DESCRIPTION = 'Políticas de controle de acesso aos dados do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/access-control' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/access-control',
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

export default function AccessControlPage() {
  return <span>Control de Acesso</span>
}
