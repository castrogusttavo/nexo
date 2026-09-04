import type { Metadata } from 'next'

const TITLE = 'Segurança | Nexo'
const DESCRIPTION = 'Práticas de segurança adotadas pelo Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/security' },
  openGraph: {
    type: 'website',
    url: '/legals/security',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function SecurityPage() {
  return <span>Segurança</span>
}
