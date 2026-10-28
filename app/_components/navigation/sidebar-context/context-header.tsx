import type { ReactNode } from 'react'

export function ContextHeader({
  title,
  actions,
  primaryAction,
}: {
  title: string
  actions?: ReactNode
  primaryAction?: ReactNode
}) {
  return (
    <div className='w-full space-y-2'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold'>{title}</h3>
        {actions && <div className='flex items-center'>{actions}</div>}
      </div>
      {primaryAction}
    </div>
  )
}
