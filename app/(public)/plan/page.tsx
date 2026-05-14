import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { MembershipRepository } from '@/src/repositories/membership.repository'
import { PlanSubscribeButton } from './plan-subscribe-button'

export const metadata: Metadata = {
  title: 'Planos | Nexo',
  description: 'Conheça os planos do Nexo e escolha o ideal para o seu time.',
}

export default async function PlanPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  let workspaceId: string | null = null
  if (session) {
    const memberships = await MembershipRepository.listByUser(session.user.id)
    if (memberships.ok && memberships.value.length > 0) {
      workspaceId = memberships.value[0].workspaceId
    }
  }

  return (
    <div>
      <PlanSubscribeButton workspaceId={workspaceId} />
    </div>
  )
}
