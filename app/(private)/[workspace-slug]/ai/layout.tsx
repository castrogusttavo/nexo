import {
  PanelLeftIcon,
  SlidersHorizontalIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
} from '@/app/_components/navigation/sidebar-context'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '',
  description: '',
}

export default function AiLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ContextSidebar>
        <ContextHeader
          title='Nexo IA'
          actions={
            <Button variant='ghost' size='icon-sm'>
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          }
          primaryAction={
            <ContextPrimaryAction>
              <NexoIcon icon={SlidersHorizontalIcon} />
              Novo chat
            </ContextPrimaryAction>
          }
        />
      </ContextSidebar>
      {children}
    </>
  )
}
