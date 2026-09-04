import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Segurança da Informação | Nexo',
  description: 'Políticas de segurança da informação do Nexo.',
  alternates: { canonical: '/legals/trust/information-security' },
}

export default function InformationSecurityPage() {
  return <span>Segurança da Informação</span>
}
