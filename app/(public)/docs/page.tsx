import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentação | Nexo',
  description: 'Guias e referências para usar o Nexo.',
  alternates: { canonical: '/docs' },
}

export default function DocsPage() {
  return <span>Docs</span>
}
