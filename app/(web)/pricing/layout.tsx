import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Nexo Pricing | Simple per-seat plans for teams that ship',
  description: '',
}

export default function WebLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
