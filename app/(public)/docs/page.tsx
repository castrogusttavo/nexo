import type { Metadata } from 'next'

const TITLE = 'Documentação | Nexo'
const DESCRIPTION = 'Guias e referências para usar o Nexo.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/docs' },
  openGraph: {
    type: 'website',
    url: '/docs',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function DocsPage() {
  return <span>Docs</span>
}
