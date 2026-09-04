import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Segurança | Nexo',
  description: 'Práticas de segurança adotadas pelo Nexo.',
  alternates: { canonical: '/legals/security' },
}

export default function SecurityPage() {
  return <span>Segurança</span>
}
