'use client'

import { CheckmarkCircle02Icon } from '@hugeicons-pro/core-bulk-rounded'
import Link from 'next/link'
import { NexoIcon } from '@/components/icon/icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, DateFormat } from '@/lib/utils'
import { STATUS_META } from '@/src/services/status/status-map'
import type { DailyPoint } from '@/types/status'

interface HistoryBarsProps {
  history: DailyPoint[]
}

export function HistoryBars({ history }: HistoryBarsProps) {
  if (history.length === 0) {
    return (
      <div className='text-xs text-muted-foreground'>
        Sem dados coletados ainda.
      </div>
    )
  }

  return (
    <div className='flex items-center justify-end'>
      {history.map((point) => {
        const meta = STATUS_META[point.status]
        const date = new Date(`${point.day}T00:00:00Z`)
        const summary = (
          <div className='flex items-center gap-1'>
            <NexoIcon
              icon={CheckmarkCircle02Icon}
              className={meta.bar.replace('bg-', 'text-')}
              size={16}
              strokeWidth={1}
            />
            {meta.label} · {point.uptimePct.toFixed(2)}% uptime
          </div>
        )

        return (
          <Tooltip key={point.day}>
            <TooltipTrigger
              render={
                <div
                  className={cn(
                    'w-1 h-4 rounded-xs',
                    meta.bar,
                    point.incidentId && 'cursor-pointer',
                  )}
                />
              }
            />
            <TooltipContent side='bottom' className='flex flex-col gap-2'>
              {DateFormat(date)}
              {point.incidentId ? (
                <Link href={`/status/incident/${point.incidentId}`} className='underline-offset-2 hover:underline'>
                  {summary}
                </Link>
              ) : (
                summary
              )}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
