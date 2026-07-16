import { ArrowRight02Icon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  type Billing,
  formatCurrency,
  PAID_PLAN_PRICES,
  priceForBilling,
} from '../(web)/_components/pricing/plans'

interface UpgradePlanSelectionCardProps {
  plan: string | null
  billing: Billing
  onPlanChange: (plan: 'PRO' | 'BUSINESS') => void
}

export function UpgradePlanSelectionCard({
  plan,
  billing,
  onPlanChange,
}: UpgradePlanSelectionCardProps) {
  return (
    <div className='bg-muted w-full p-5 rounded-lg flex flex-col gap-7'>
      <FieldSet>
        <FieldLegend>
          Escolha seu plano <span className='text-destructive'>*</span>
        </FieldLegend>
        <RadioGroup
          className='w-full flex justify-between'
          value={plan ?? ''}
          onValueChange={(value) => onPlanChange(value as 'PRO' | 'BUSINESS')}
        >
          <FieldLabel htmlFor='subscription-pro'>
            <Field className='h-full'>
              <FieldContent className='h-full px-5 py-4 flex flex-col gap-6 justify-between'>
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center justify-between'>
                    <FieldTitle>Pro</FieldTitle>
                  </div>
                  <FieldDescription>
                    Para equipes de pequeno a médio porte
                  </FieldDescription>
                </div>
                <div className='flex items-center gap-1.5'>
                  <FieldTitle className='text-xl font-semibold'>
                    {formatCurrency(
                      priceForBilling(PAID_PLAN_PRICES.PRO, billing),
                    )}
                  </FieldTitle>
                  <Muted>usuário/mês</Muted>
                </div>
              </FieldContent>
              <RadioGroupItem
                value='PRO'
                id='subscription-pro'
                className='hidden'
              />
            </Field>
          </FieldLabel>

          <FieldLabel htmlFor='subscription-business'>
            <Field className='h-full'>
              <FieldContent className='h-full! px-5 py-4 flex flex-col gap-6 justify-between'>
                <div className='flex flex-col gap-1'>
                  <div className='flex items-center justify-between'>
                    <FieldTitle>Business</FieldTitle>
                    <Badge className='bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300'>
                      Popular
                    </Badge>
                  </div>
                  <FieldDescription>
                    Para organizações de escala
                  </FieldDescription>
                </div>
                <div className='flex items-center gap-1.5'>
                  <FieldTitle className='text-xl font-semibold'>
                    {formatCurrency(
                      priceForBilling(PAID_PLAN_PRICES.BUSINESS, billing),
                    )}
                  </FieldTitle>
                  <Muted>usuário/mês</Muted>
                </div>
              </FieldContent>
              <RadioGroupItem
                value='BUSINESS'
                id='subscription-business'
                className='hidden'
              />
            </Field>
          </FieldLabel>
        </RadioGroup>
      </FieldSet>
      <div className='bg-card rounded-lg px-5 py-3 flex items-center justify-between text-sm'>
        <h5>Quer a experiência completa do Nexo Cloud empresarial?</h5>
        <Link href='/talk-to-sales'>
          <Button variant='link' size='sm' className='text-sky-400'>
            Fale com vendas <NexoIcon icon={ArrowRight02Icon} strokeWidth={2} />
          </Button>
        </Link>
      </div>
    </div>
  )
}
