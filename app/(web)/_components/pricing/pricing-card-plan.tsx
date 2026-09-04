'use client'

import {
  AiMagicIcon,
  ArrowRight01Icon,
  CheckIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { sendGAEvent } from '@next/third-parties/google'
import Link from 'next/link'
import { useQueryState } from 'nuqs'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  formatCurrency,
  formatPlanName,
  getPrice,
  PLANS,
  type PlanGrid,
  previousPlan,
  priceForBilling,
  upgradeUrl,
  yearlyDiscount,
} from './plans'
import { billingParser } from './plans-params'

interface PricingCardPlanProps {
  plan: PlanGrid
}

export function PricingCardPlan({ plan }: PricingCardPlanProps) {
  const [billing] = useQueryState('billing', billingParser)

  const { description, features } = PLANS[plan]
  const price = getPrice(plan)
  const previous = previousPlan(plan)
  const discount = price ? yearlyDiscount(price) : 0

  function trackClick() {
    sendGAEvent('event', 'pricing_plan_click', { plan, billing })
  }

  return (
    <div className='border border-border w-full'>
      <div className='flex flex-col gap-6 border-b border-border p-6'>
        <div className='flex items-center justify-between'>
          <h5 className='font-medium text-base'>{formatPlanName(plan)}</h5>
          {discount > 0 && (
            <Muted className='text-orange-700 dark:text-orange-300 text-xs font-medium'>
              ECONOMIZE {Math.round(discount * 100)}%
            </Muted>
          )}
        </div>
        <div className='flex flex-col gap-6'>
          <div className='h-12 flex items-center gap-2'>
            {price ? (
              <>
                <h5 className='text-2xl font-medium'>
                  {formatCurrency(priceForBilling(price, billing))}
                </h5>
                <Muted>por usuário/mês</Muted>
              </>
            ) : (
              <h5 className='text-2xl font-medium'>Cotação a pedido</h5>
            )}
          </div>
          <Muted className='text-sm'>{description}</Muted>
          <div className='flex flex-col gap-2'>
            {plan === 'ENTERPRISE' ? (
              <Button
                nativeButton={false}
                size='sm'
                className='w-full'
                render={
                  <Link href='/talk-to-sales' onClick={trackClick}>
                    Falar com vendas
                  </Link>
                }
              />
            ) : plan === 'FREE' ? (
              <Button
                nativeButton={false}
                size='sm'
                variant='outline'
                className='w-full'
                render={
                  <Link href='/sign-up' onClick={trackClick}>
                    Comece grátis
                  </Link>
                }
              />
            ) : (
              <Button
                nativeButton={false}
                size='sm'
                className='w-full'
                render={
                  <Link href={upgradeUrl(plan, billing)} onClick={trackClick}>
                    Obter {formatPlanName(plan)} por este preço
                  </Link>
                }
              />
            )}
            {plan === 'FREE' || plan === 'ENTERPRISE' ? (
              <Button
                variant='ghost'
                size='sm'
                className='hover:bg-transparent! cursor-auto'
              />
            ) : (
              <Button variant='ghost' size='sm' className='w-full'>
                Iniciar teste gratuito de duas semanas
                <NexoIcon icon={ArrowRight01Icon} />
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-6 p-6'>
        <div className='flex flex-col gap-3'>
          <Muted className='text-primary font-semibold text-sm'>
            {previous
              ? `Tudo do ${formatPlanName(previous)} +`
              : 'Comece grátis com'}
          </Muted>
          <ul className='flex flex-col gap-3'>
            {features.map((feature, index) => {
              const isAi = index === 0

              return (
                <li key={feature.title}>
                  <Tooltip>
                    <TooltipTrigger
                      className={cn(
                        'text-start flex items-center gap-1.5 hover:underline',
                        isAi && 'text-branding-600 dark:text-branding-400',
                      )}
                    >
                      <NexoIcon
                        icon={isAi ? AiMagicIcon : CheckIcon}
                        size={20}
                        strokeWidth={2}
                      />
                      {feature.title}
                    </TooltipTrigger>
                    <TooltipContent
                      side='bottom'
                      align='start'
                      className='text-sm'
                    >
                      {feature.description}
                    </TooltipContent>
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
