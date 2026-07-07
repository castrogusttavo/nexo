import { PricingTableGroup } from './pricing-table-group'
import { PricingTableHeader } from './pricing-table-header'

export function PricingTableDetailsPlan() {
  return (
    <div className='relative border-x border-border w-full mb-20' id='features'>
      <PricingTableHeader />
      <PricingTableGroup />
    </div>
  )
}
