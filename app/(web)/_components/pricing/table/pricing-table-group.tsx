import { Table } from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PLAN_ORDER, type PlanGrid } from '../plans'
import { IncludedIcon, InfoIcon, NotIncludedIcon } from './pricing-icons'
import {
  PRICING_GROUPS,
  type PricingCell,
  type PricingRow,
  resolvePricingCell,
} from './pricing-table-data'

// The cell and row styles are set once on the table instead of on each of the
// ~450 cells: the page ships every class string twice (HTML and RSC payload).
const TABLE_CLASSES =
  'w-full table-fixed border-y border-border [&_td]:p-4 [&_td]:align-middle [&_td]:whitespace-nowrap [&_td]:text-sm [&_td]:border-l [&_td]:border-border [&_tr]:border-b [&_tr]:transition-colors [&_tr]:hover:bg-muted/50 [&_tr]:has-aria-expanded:bg-muted/50 [&_tr:last-child]:border-0'

export function PricingTableGroup() {
  return (
    <div>
      {PRICING_GROUPS.map((group) => (
        <div key={group.title}>
          <GroupCell title={group.title} />
          <Table className={TABLE_CLASSES}>
            <tbody>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <FeatureCell label={row.label} tooltip={row.tooltip} />
                  {PLAN_ORDER.map((plan) => (
                    <PlanValueCell key={plan} row={row} plan={plan} />
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ))}
    </div>
  )
}

function PlanValueCell({ row, plan }: { row: PricingRow; plan: PlanGrid }) {
  const cell = resolvePricingCell(row, plan)

  return (
    <td className='text-center lg:w-[17.5%]'>
      <CellContent cell={cell} />
    </td>
  )
}

function CellContent({ cell }: { cell: PricingCell }) {
  if (cell.kind === 'check') return <IncludedIcon className='mx-auto' />
  if (cell.kind === 'dash') return <NotIncludedIcon className='mx-auto' />

  return <>{cell.text}</>
}

function FeatureCell({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <td className='lg:w-[30%] font-semibold'>
      <div className='flex items-center gap-2'>
        {label}
        <Tooltip>
          <TooltipTrigger>
            <InfoIcon />
          </TooltipTrigger>
          <TooltipContent align='start'>{tooltip}</TooltipContent>
        </Tooltip>
      </div>
    </td>
  )
}

function GroupCell({ title }: { title: string }) {
  return (
    <div className='w-full lg:w-[30%] p-4 pt-12 border-border'>
      <span className='font-medium text-lg'>{title}</span>
    </div>
  )
}
