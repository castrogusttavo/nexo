'use client'

import { useQueryState } from 'nuqs'
import { Field, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import { billingParser } from './plans-params'

export function BillingToggle() {
  const [billing, setBilling] = useQueryState('billing', billingParser)

  return (
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
  )
}
