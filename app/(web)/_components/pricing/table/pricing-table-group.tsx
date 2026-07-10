import {
  CheckIcon,
  InformationCircleIcon,
  SolidLine01Icon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PLAN_ORDER, type PlanGrid } from '../plans'
import {
  PRICING_GROUPS,
  type PricingCell,
  type PricingRow,
  resolvePricingCell,
} from './pricing-table-data'

export function PricingTableGroup() {
  return (
    <div>
      {PRICING_GROUPS.map((group) => (
        <div key={group.title}>
          <GroupCell title={group.title} />
          <Table className='w-full table-fixed border-y border-border'>
            <TableBody>
              {group.rows.map((row) => (
                <TableRow key={row.key}>
                  <FeatureCell label={row.label} tooltip={row.tooltip} />
                  {PLAN_ORDER.map((plan) => (
                    <PlanValueCell key={plan} row={row} plan={plan} />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  )
}

function PlanValueCell({ row, plan }: { row: PricingRow; plan: PlanGrid }) {
  const cell = resolvePricingCell(row, plan)

  return (
    <TableCell className='text-sm border-l border-border p-4 text-center lg:w-[17.5%]'>
      <CellContent cell={cell} />
    </TableCell>
  )
}

function CellContent({ cell }: { cell: PricingCell }) {
  if (cell.kind === 'check') {
    return (
      <NexoIcon
        icon={CheckIcon}
        size={20}
        strokeWidth={2}
        className='mx-auto'
      />
    )
  }

  if (cell.kind === 'dash') {
    return (
      <NexoIcon
        icon={SolidLine01Icon}
        size={20}
        strokeWidth={2}
        className='mx-auto text-muted-foreground'
      />
    )
  }

  return <>{cell.text}</>
}

function FeatureCell({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <TableCell className='text-sm border-l border-border p-4 lg:w-[30%] font-semibold'>
      <div className='flex items-center gap-2'>
        {label}
        <Tooltip>
          <TooltipTrigger>
            <NexoIcon icon={InformationCircleIcon} strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent align='start'>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
    </TableCell>
  )
}

function GroupCell({ title }: { title: string }) {
  return (
    <div className='w-full lg:w-[30%] p-4 pt-12 border-border'>
      <span className='font-medium text-lg'>{title}</span>
    </div>
  )
}
