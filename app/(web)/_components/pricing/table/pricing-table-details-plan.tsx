import { PricingTableGroup } from './pricing-table-group'
import { PricingTableHeader } from './pricing-table-header'
import { PricingTableMobilePlans } from './pricing-table-mobile-plans'

export function PricingTableDetailsPlan() {
  return (
    <div className='relative border-x border-border w-full mb-20' id='features'>
      <div className='md:hidden'>
        <PricingTableMobilePlans />
      </div>
      <div className='hidden md:block'>
        <PricingTableHeader />
        <PricingTableGroup />
      </div>
    </div>
  )
}
