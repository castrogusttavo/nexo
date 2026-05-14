import type { ReactNode } from 'react'

export default function HeaderInternalNavigation({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className='sticky top-0 z-18 h-11 flex gap-2 w-full items-center justify-between px-5 border-b border-secondary bg-primary-foreground'>
      {children}
    </div>
  )
}
