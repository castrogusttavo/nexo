import type { Metadata } from 'next'
import { type ReactNode, Suspense } from 'react'
import { ConsentGate } from '../_components/consent-gate'

export const metadata: Metadata = {
  title: 'Criar workspace | Nexo',
  description: 'Crie um novo workspace para o seu time no Nexo.',
}

// The form is a client component and POST /api/workspaces enforces consent
// itself; the gate sends an unconsented visitor away from the page as well.
export default function CreateWorkspaceLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      <Suspense fallback={null}>
        <ConsentGate resource='page:create-workspace' />
      </Suspense>
      {children}
    </>
  )
}
