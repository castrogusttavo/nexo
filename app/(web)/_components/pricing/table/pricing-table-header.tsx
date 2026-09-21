'use client'

import { useQueryState } from 'nuqs'
import { ButtonLink } from '@/components/button-link'
import { Muted } from '@/components/typography/text/muted'
import {
  type Billing,
  formatCurrency,
  formatPlanName,
  getPrice,
  PLAN_ORDER,
  type PlanGrid,
  priceForBilling,
  upgradeUrl,
} from '../plans'
import { billingParser } from '../plans-params'

export function PricingTableHeader() {
  const [billing] = useQueryState('billing', billingParser)

  return (
    <div className='border-b border-border z-30 hidden lg:sticky lg:top-16 lg:flex lg:justify-end bg-background'>
      <div className='w-full lg:w-[30%] p-4 border-border'>
        <span className='font-medium text-xl'>Funcionalidades</span>
      </div>
      <div className='border-border w-full flex shrink-0 justify-evenly lg:w-[70%]'>
        {PLAN_ORDER.map((plan) => (
          <PlanColumn key={plan} plan={plan} billing={billing} />
        ))}
      </div>
    </div>
  )
}

function PlanColumn({ plan, billing }: { plan: PlanGrid; billing: Billing }) {
  const price = getPrice(plan)

  return (
    <div className='flex flex-col gap-3 w-full border-l border-border p-4'>
      <span className='font-medium text-xl'>{formatPlanName(plan)}</span>
      <Muted>
        {price ? (
          <>
            <strong className='font-normal text-base text-primary'>
              {formatCurrency(priceForBilling(price, billing))}
            </strong>{' '}
            por usuário/mês
          </>
        ) : (
          <strong className='font-normal text-base text-primary'>
            Cotação a pedido
          </strong>
        )}
      </Muted>
      <PlanCta plan={plan} billing={billing} />
    </div>
  )
}

function PlanCta({ plan, billing }: { plan: PlanGrid; billing: Billing }) {
  if (plan === 'ENTERPRISE') {
    return <ButtonLink href='/talk-to-sales'>Fale conosco</ButtonLink>
  }

  if (plan === 'FREE') {
    return (
      <ButtonLink href='/sign-up' variant='outline'>
        Comece grátis
      </ButtonLink>
    )
  }

  return (
    <ButtonLink href={upgradeUrl(plan, billing)}>
      Obtenha o {formatPlanName(plan)}
    </ButtonLink>
  )
}
