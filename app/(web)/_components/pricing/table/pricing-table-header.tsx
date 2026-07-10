'use client'

import Link from 'next/link'
import { useQueryState } from 'nuqs'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
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
    return (
      <Button
        nativeButton={false}
        render={<Link href='/talk-to-sales'>Fale conosco</Link>}
      />
    )
  }

  if (plan === 'FREE') {
    return (
      <Button
        variant='outline'
        nativeButton={false}
        render={<Link href='/sign-up'>Comece grátis</Link>}
      />
    )
  }

  return (
    <Button
      nativeButton={false}
      render={
        <Link href={upgradeUrl(plan, billing)}>
          Obtenha o {formatPlanName(plan)}
        </Link>
      }
    />
  )
}
