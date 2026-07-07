import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WebHeader } from './_components/header/web-header'

export const metadata: Metadata = {
  title: 'AI-native project management | Nexo',
  description: '',
}

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div className='w-full h-full'>
      <WebHeader />
      {children}
    </div>
  )
}
