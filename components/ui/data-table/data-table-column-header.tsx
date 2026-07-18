'use client'

import type { Column } from '@tanstack/react-table'
import {
  ArrowDown01Icon,
  ArrowDownWideNarrowIcon,
  ArrowUpNarrowWideIcon,
  EraserIcon,
  CheckIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
  ascLabel?: string
  descLabel?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ascLabel = 'Crescente',
  descLabel = 'Decrescente'
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-sm text-muted-foreground hover:text-primary', className)}>{title}</div>
  }

  const sorted = column.getIsSorted()
  const icon = sorted === 'desc' ? ArrowUpNarrowWideIcon : sorted === 'asc' ? ArrowDownWideNarrowIcon : ArrowDown01Icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className='flex items-center w-full justify-between text-muted-foreground hover:text-primary'>
        <span>{title}</span>
        <NexoIcon icon={icon} strokeWidth={2} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-full min-w-48 text-xs!'>
        <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
          <NexoIcon icon={ArrowDownWideNarrowIcon} className='mr-1' strokeWidth={2} />
          {ascLabel}
          {sorted === 'asc' && <NexoIcon icon={CheckIcon} strokeWidth={2} className='ml-auto' />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
          <NexoIcon icon={ArrowUpNarrowWideIcon} className='mr-1' strokeWidth={2} />
          {descLabel}
          {sorted === 'desc' && <NexoIcon icon={CheckIcon} strokeWidth={2} className='ml-auto' />}
        </DropdownMenuItem>
        {sorted && (
          <DropdownMenuItem disabled={!sorted} onClick={() => column.clearSorting()}>
            <NexoIcon icon={EraserIcon} className='mr-1' strokeWidth={2} />
            Remover ordenação
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
