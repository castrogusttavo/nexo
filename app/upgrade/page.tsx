import { redirect } from 'next/navigation'
import { getAuthSession } from '@/src/lib/auth-session'
import { MembershipService } from '@/src/services/membership.service'
import { UpgradeForm } from './upgrade-form'

const BILLING_ROLES = ['OWNER', 'ADMIN'] as const

export default async function UpgradePage() {
  const session = await getAuthSession()
  if (!session.ok) redirect('/sign-in?redirect=%2Fupgrade')

  const memberships = await MembershipService.listByUser(session.value.user.id)

  const workspaces = memberships.ok
    ? memberships.value
        .filter((m) => BILLING_ROLES.includes(m.role as never))
        .map((m) => ({
          id: m.workspace.id,
          name: m.workspace.name,
          activePlan: m.workspace.activePlan,
        }))
    : []

  return <UpgradeForm workspaces={workspaces} />
}
