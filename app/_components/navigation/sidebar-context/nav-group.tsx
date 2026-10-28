import type { ReactNode } from 'react'

export function NavGroup({ children }: { children: ReactNode }) {
  return <div className='space-y-0.5'>{children}</div>
}
