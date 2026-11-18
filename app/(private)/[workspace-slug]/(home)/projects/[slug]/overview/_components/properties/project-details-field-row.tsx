import type { ComponentProps, ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'

// One line of the properties panel: the property on the left, its control on
// the right.
export function ProjectDetailsFieldRow({
  icon,
  label,
  strokeWidth = 2,
  children,
}: {
  icon: ComponentProps<typeof NexoIcon>['icon']
  label: string
  strokeWidth?: number
  children: ReactNode
}) {
  return (
    <div className='min-h-8 flex items-center gap-2'>
      <div className='text-muted-foreground flex gap-1 items-center w-2/5'>
        <NexoIcon icon={icon} strokeWidth={strokeWidth} />
        <span className='text-sm font-medium'>{label}</span>
      </div>
      {children}
    </div>
  )
}
