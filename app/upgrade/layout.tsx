import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { WebHeaderUpgrade } from '../(web)/_components/header/web-header-upgrade'

export const metadata: Metadata = {
  title: 'Upgrade | Nexo',
  description: 'Faça upgrade do seu worksapce no Nexo.',
}

export default function UpgradeLayout({ children }: { children: ReactNode }) {
  return (
    <div className='h-screen w-screen overflow-hidden bg-background p-2'>
      <div className='h-full bg-app w-full rounded-lg border border-border flex flex-col'>
        <WebHeaderUpgrade />
        <div className='flex-1 overflow-y-auto flex items-start justify-center'>
          {children}
        </div>
      </div>
    </div>
  )
}
