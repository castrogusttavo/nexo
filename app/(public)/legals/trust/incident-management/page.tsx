import type { Metadata } from 'next'

const TITLE = 'Gerenciamento de Incidentes | Nexo'
const DESCRIPTION = 'Como o Nexo detecta, responde e comunica incidentes.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/legals/trust/incident-management' },
  openGraph: {
    type: 'website',
    url: '/legals/trust/incident-management',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
}

export default function IncidentManagementPage() {
  return <span>Gerenciamento de Incidente</span>
}
