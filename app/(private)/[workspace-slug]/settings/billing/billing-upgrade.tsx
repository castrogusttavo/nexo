'use client'

import {
  AiMagicIcon,
  ArrowUpRight03Icon,
  CheckIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { useQueryState } from 'nuqs'
import {
  formatCurrency,
  formatPlanName,
  getPrice,
  PLANS,
  priceForBilling,
  upgradeUrl,
} from '@/app/(web)/_components/pricing/plans'
import { billingParser } from '@/app/(web)/_components/pricing/plans-params'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const UPGRADE_TIERS = ['PRO', 'BUSINESS', 'ENTERPRISE'] as const

export function BillingUpgrade({ currentPlan }: { currentPlan: string }) {
  const [billing, setBilling] = useQueryState('billing', billingParser)

  return (
    <div className='space-y-4'>
      <div className='w-full flex items-center justify-between'>
        <h5 className='font-semibold'>Upgrade</h5>
        <div className='flex items-center gap-4'>
          <Link href='/pricing'>
            <Muted className='flex gap-1.5 items-center'>
              Ver comparação detalhada{' '}
              <NexoIcon icon={ArrowUpRight03Icon} strokeWidth={2} />
            </Muted>
          </Link>
          <Field orientation='horizontal' className='w-fit'>
            <FieldLabel>Mensal</FieldLabel>
            <Switch
              checked={billing === 'yearly'}
              onCheckedChange={(checked) =>
                setBilling(checked ? 'yearly' : 'monthly')
              }
            />
            <FieldLabel>Anual</FieldLabel>
          </Field>
        </div>
      </div>

      <div className='w-full bg-muted rounded-lg border border-border overflow-hidden'>
        <div className='grid grid-cols-4'>
          <h6 className='p-4'>Planos</h6>
          {UPGRADE_TIERS.map((tier) => {
            const price = getPrice(tier)
            const isCurrent = tier === currentPlan
            return (
              <div
                key={tier}
                className='px-6 py-4 flex flex-col gap-4 border-l border-border'
              >
                <div className='flex flex-col gap-2'>
                  <span className='font-medium'>{formatPlanName(tier)}</span>
                  {price ? (
                    <Muted>
                      <strong className='text-base font-medium text-primary'>
                        {formatCurrency(priceForBilling(price, billing))}
                      </strong>{' '}
                      usuário/mês
                    </Muted>
                  ) : (
                    <strong className='text-base font-medium text-primary'>
                      Cotação a pedido
                    </strong>
                  )}
                </div>

                {isCurrent ? (
                  <Button variant='outline' className='w-full' disabled>
                    Plano atual
                  </Button>
                ) : tier === 'ENTERPRISE' ? (
                  <Button
                    className='w-full'
                    nativeButton={false}
                    render={<Link href='/talk-to-sales'>Falar com vendas</Link>}
                  />
                ) : (
                  <Button
                    className='w-full'
                    nativeButton={false}
                    render={
                      <Link href={upgradeUrl(tier, billing)}>
                        Atualizar para {formatPlanName(tier)}
                      </Link>
                    }
                  />
                )}
              </div>
            )
          })}
        </div>

        <div className='grid grid-cols-4 bg-primary-foreground'>
          <h6 className='p-4'>Destaques</h6>
          {UPGRADE_TIERS.map((tier) => (
            <ul
              key={tier}
              className='px-6 py-4 flex flex-col gap-3 border-l border-border'
            >
              {PLANS[tier].features.slice(0, 6).map((feature, index) => {
                const isAi = index === 0
                return (
                  <li key={feature.title}>
                    <Tooltip>
                      <TooltipTrigger
                        className={cn(
                          'text-start flex items-center gap-1.5 text-sm hover:underline',
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
          ))}
        </div>
      </div>
    </div>
  )
}
