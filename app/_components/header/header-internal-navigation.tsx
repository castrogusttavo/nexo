import type { ReactNode } from 'react'
import { ContextSidebarExpandButton } from '../navigation/sidebar-context'

export default function HeaderInternalNavigation({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className='sticky top-0 z-18 h-11 flex gap-2 w-full items-center justify-between px-5 border-b border-secondary bg-app'>
      <ContextSidebarExpandButton />
      <div className='flex flex-1 min-w-0 items-center justify-between gap-2'>
        {children}
      </div>
    </div>
  )
}
