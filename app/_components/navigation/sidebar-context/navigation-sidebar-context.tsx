import type { ReactNode } from 'react'

export function ContextSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className='p-3 border-r border-border h-full w-62.5'>
      <div className='space-y-4'>{children}</div>
    </aside>
  )
}
