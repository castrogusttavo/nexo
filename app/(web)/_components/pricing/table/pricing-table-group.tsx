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

export function PricingTableGroup() {
  return (
    <div>
      <GroupCell />
      <Table className='w-full table-fixed border-y border-border'>
        <TableBody>
          <TableRow>
            <FeatureCell
              feature='Estimativas'
              featureExplain='Meça o esforço em pontos em um sistema que funcionará para você.'
            />
            <TableCell className='text-sm border-l border-border p-4 text-center lg:w-[17.5%]'>
              Básico
            </TableCell>
            <TableCell className='text-sm border-l border-border p-4 text-center lg:w-[17.5%]'>
              Avançado
            </TableCell>
            <TableCell className='text-sm border-l border-border p-4 text-center lg:w-[17.5%]'>
              <NexoIcon
                icon={CheckIcon}
                size={20}
                strokeWidth={2}
                className='mx-auto'
              />
            </TableCell>
            <TableCell className='text-sm border-l border-border p-4 text-center lg:w-[17.5%]'>
              <NexoIcon
                icon={SolidLine01Icon}
                size={20}
                strokeWidth={2}
                className='mx-auto'
              />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}

function FeatureCell({
  feature,
  featureExplain,
}: {
  feature: string
  featureExplain: string
}) {
  return (
    <TableCell className='text-sm border-l border-border p-4 lg:w-[30%] font-semibold'>
      <div className='flex items-center gap-2'>
        {feature}
        <Tooltip>
          <TooltipTrigger>
            <NexoIcon icon={InformationCircleIcon} strokeWidth={2} />
          </TooltipTrigger>
          <TooltipContent align='start'>{featureExplain}</TooltipContent>
        </Tooltip>
      </div>
    </TableCell>
  )
}

function GroupCell() {
  return (
    <div className='w-full lg:w-[30%] p-4 pt-12 border-border'>
      <span className='font-medium text-lg'>
        Gerenciamento de Projetos Principais
      </span>
    </div>
  )
}
