'use client'

import { Muted } from '@/components/typography/text/muted'
import { UpgradeOrderSummaryCard } from './upgrade-order-summary-card'
import { UpgradePlanSelectionCard } from './upgrade-plan-selection-card'
import { UpgradeWorkspaceSeatsCard } from './upgrade-workspace-seats-card'
import { useUpgradeCheckout } from './use-upgrade-checkout'

interface UpgradeWorkspace {
  id: string
  name: string
  activePlan: string
}

export function UpgradeForm({
  workspaces,
}: {
  workspaces: UpgradeWorkspace[]
}) {
  const checkout = useUpgradeCheckout(workspaces)

  return (
    <main className='flex flex-col gap-6 mx-auto max-w-286 p-12'>
      <div className='w-full flex flex-col gap-1.5'>
        <h4 className='font-medium text-2xl'>Atualize seu workspace</h4>
        <Muted>
          Esta atualização aplica-se a um workspace da nuvem. Escolha um plano e
          quantidade de usuários.
        </Muted>
      </div>
      <div className='grid grid-cols-1 gap-6 items-start lg:grid-cols-[minmax(0,1fr)_400px]'>
        <div className='flex flex-col w-full gap-6'>
          <UpgradeWorkspaceSeatsCard
            workspaces={workspaces}
            workspaceId={checkout.workspaceId}
            onWorkspaceChange={checkout.setWorkspaceId}
            seats={checkout.seats}
            onSeatsChange={checkout.setSeats}
          />
          <UpgradePlanSelectionCard
            plan={checkout.plan}
            billing={checkout.billing}
            onPlanChange={checkout.setPlan}
          />
        </div>

        <UpgradeOrderSummaryCard checkout={checkout} />
      </div>
    </main>
  )
}
