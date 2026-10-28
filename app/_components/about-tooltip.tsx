import { InformationCircleIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function AboutTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger aria-label='Saiba mais'>
        <NexoIcon
          icon={InformationCircleIcon}
          strokeWidth={2}
          className='text-muted-foreground'
          size={16}
        />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
