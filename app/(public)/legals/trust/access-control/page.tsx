import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Controle de Acesso | Nexo',
  description: 'Políticas de controle de acesso aos dados do Nexo.',
  alternates: { canonical: '/legals/trust/access-control' },
}

export default function AccessControlPage() {
  return <span>Control de Acesso</span>
}
