import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export function ContextSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className='p-3 border-r border-border h-full w-62.5'>
      <div className='space-y-4'>{children}</div>
    </aside>
  )
}

// The same frame as ContextSidebar, for a sidebar that waits on the slug or
// the viewer: the page beside it keeps its place while the links arrive.
export function ContextSidebarSkeleton() {
  return (
    <aside aria-hidden className='p-3 border-r border-border h-full w-62.5'>
      <div className='space-y-4'>
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    </aside>
  )
}
