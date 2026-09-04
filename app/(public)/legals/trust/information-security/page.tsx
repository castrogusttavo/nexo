import type { Metadata } from 'next'

const TITLE = 'Segurança da Informação | Nexo'
const DESCRIPTION = 'Políticas de segurança da informação do Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/information-security' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/information-security',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function InformationSecurityPage() {
  return <span>Segurança da Informação</span>
}
