import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type ContextSidebarSectionId,
  contextSidebarId,
} from './context-sidebar-sections'

// The aside is the part that collapses (CONTEXT_SIDEBAR_STYLE animates its
// width to 0); the frame inside keeps its own width, so the links are clipped
// while it slides instead of reflowing on every frame. shrink-0 holds 214px
// on every page: without it the flex row squeezed the sidebar by whatever the
// main area's w-full asked for, so its width changed with the page.
const FRAME = 'w-53.5 h-full p-3 border-r border-border space-y-4'

export function ContextSidebar({
  section,
  children,
}: {
  section?: ContextSidebarSectionId
  children: ReactNode
}) {
  return (
    <aside
      id={section && contextSidebarId(section)}
      data-context-sidebar={section}
      className='w-53.5 h-full shrink-0 overflow-x-clip'
    >
      <div className={FRAME}>{children}</div>
    </aside>
  )
}

// The same frame as ContextSidebar, for a sidebar that waits on the slug or
// the viewer: the page beside it keeps its place while the links arrive.
export function ContextSidebarSkeleton({
  section,
}: {
  section?: ContextSidebarSectionId
} = {}) {
  return (
    <aside
      aria-hidden
      data-context-sidebar={section}
      className='w-53.5 h-full shrink-0 overflow-x-clip'
    >
      <div className='space-y-4'>
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-40 w-full' />
      </div>
    </aside>
  )
}
