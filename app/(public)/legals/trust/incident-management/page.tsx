import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gerenciamento de Incidentes | Nexo',
  description: 'Como o Nexo detecta, responde e comunica incidentes.',
  alternates: { canonical: '/legals/trust/incident-management' },
}

export default function IncidentManagementPage() {
  return <span>Gerenciamento de Incidente</span>
}
