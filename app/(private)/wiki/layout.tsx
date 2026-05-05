import {
  PanelLeftIcon,
  SlidersHorizontalIcon,
} from '@hugeicons-pro/core-stroke-rounded'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  ContextHeader,
  ContextPrimaryAction,
  ContextSidebar,
} from '@/app/_components/navigation/context-sidebar-navigation'

export default function WikiLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ContextSidebar>
        <ContextHeader
          title='Wiki'
          actions={
            <Button variant='ghost' size='icon-sm'>
              <NexoIcon icon={PanelLeftIcon} strokeWidth={2} />
            </Button>
          }
          primaryAction={
            <ContextPrimaryAction>
              <NexoIcon icon={SlidersHorizontalIcon} />
              Nova página
            </ContextPrimaryAction>
          }
        />
      </ContextSidebar>
      {children}
    </>
  )
}
