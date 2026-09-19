'use client'

import {
  CheckIcon,
  InformationCircleIcon,
  SolidLine01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatPlanName, PLAN_ORDER, type PlanGrid } from '../plans'
import {
  PRICING_GROUPS,
  type PricingCell,
  resolvePricingCell,
} from './pricing-table-data'

export function PricingTableMobilePlans() {
  return (
    <Tabs defaultValue={PLAN_ORDER[0]}>
      <TabsList className='w-full sticky top-16 z-30'>
        {PLAN_ORDER.map((plan) => (
          <TabsTrigger key={plan} value={plan} className='flex-1'>
            {formatPlanName(plan)}
          </TabsTrigger>
        ))}
      </TabsList>
      {PLAN_ORDER.map((plan) => (
        <TabsContent key={plan} value={plan}>
          <PlanFeatureList plan={plan} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function PlanFeatureList({ plan }: { plan: PlanGrid }) {
  return (
    <div className='flex flex-col'>
      {PRICING_GROUPS.map((group) => (
        <div key={group.title}>
          <div className='p-4 pt-8'>
            <span className='font-medium text-lg'>{group.title}</span>
          </div>
          <ul className='border-y border-border'>
            {group.rows.map((row) => {
              const cell = resolvePricingCell(row, plan)

              return (
                <li
                  key={row.key}
                  className='flex items-center justify-between gap-4 border-border p-4 text-sm not-first:border-t'
                >
                  <div className='flex items-center gap-2 font-semibold'>
                    {row.label}
                    <Tooltip>
                      <TooltipTrigger>
                        <NexoIcon
                          icon={InformationCircleIcon}
                          strokeWidth={2}
                        />
                      </TooltipTrigger>
                      <TooltipContent align='start'>
                        {row.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <CellValue cell={cell} />
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function CellValue({ cell }: { cell: PricingCell }) {
  if (cell.kind === 'check') {
    return (
      <NexoIcon
        icon={CheckIcon}
        size={20}
        strokeWidth={2}
        className='shrink-0'
      />
    )
  }

  if (cell.kind === 'dash') {
    return (
      <NexoIcon
        icon={SolidLine01Icon}
        size={20}
        strokeWidth={2}
        className='shrink-0 text-muted-foreground'
      />
    )
  }

  return <span className='shrink-0 text-muted-foreground'>{cell.text}</span>
}
