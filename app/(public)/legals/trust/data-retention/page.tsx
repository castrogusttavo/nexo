import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Retenção de Dados | Nexo',
  description: 'Por quanto tempo o Nexo retém seus dados.',
  alternates: { canonical: '/legals/trust/data-retention' },
}

export default function DataRentetionPage() {
  return <span>Retenção de dados</span>
}
