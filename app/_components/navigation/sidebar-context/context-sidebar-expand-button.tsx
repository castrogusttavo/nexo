'use client'

import { PanelLeftOpenIcon } from '@hugeicons-pro/core-stroke-rounded'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useContextSidebarSection } from './context-sidebar-section'
import { contextSidebarId } from './context-sidebar-sections'
import { setContextSidebarOpen } from './use-context-sidebar'

// Always rendered; CONTEXT_SIDEBAR_STYLE shows it only while the section is
// collapsed, so server and client markup match.
export function ContextSidebarExpandButton() {
  const section = useContextSidebarSection()
  if (!section) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-context-sidebar-expand={section}
            variant='ghost'
            size='icon-sm'
            aria-label='Expandir barra lateral'
            aria-controls={contextSidebarId(section)}
            onClick={() => setContextSidebarOpen(section, true)}
          >
            <NexoIcon icon={PanelLeftOpenIcon} strokeWidth={2} />
          </Button>
        }
      />
      <TooltipContent side='bottom'>Expandir barra lateral</TooltipContent>
    </Tooltip>
  )
}
