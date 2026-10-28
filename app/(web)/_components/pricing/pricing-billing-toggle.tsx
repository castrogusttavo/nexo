'use client'

import { useQueryState } from 'nuqs'
import { Suspense } from 'react'
import { Field, FieldLabel } from '@/components/ui/field'
import { Switch } from '@/components/ui/switch'
import type { Billing } from './plans'
import { billingParser, DEFAULT_BILLING } from './plans-params'

// The server renders the default; the URL's value takes over in the browser.
export function PricingBillingToggle() {
  return (
    <Suspense fallback={<BillingSwitch billing={DEFAULT_BILLING} />}>
      <BillingToggleFromUrl />
    </Suspense>
  )
}

function BillingToggleFromUrl() {
  const [billing, setBilling] = useQueryState('billing', billingParser)
  return <BillingSwitch billing={billing} onChange={setBilling} />
}

function BillingSwitch({
  billing,
  onChange,
}: {
  billing: Billing
  onChange?: (billing: Billing) => void
}) {
  return (
    <Field orientation='horizontal' className='w-fit'>
      <FieldLabel>Mensal</FieldLabel>
      <Switch
        checked={billing === 'yearly'}
        onCheckedChange={(checked) =>
          onChange?.(checked ? 'yearly' : 'monthly')
        }
      />
      <FieldLabel>Anual</FieldLabel>
    </Field>
  )
}
