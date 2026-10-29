'use client'

import { PanelLeftCloseIcon } from '@hugeicons-pro/core-stroke-rounded'
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

// No aria-expanded: this button only shows while the sidebar is open, so the
// value could never change (and the ghost variant paints it as pressed).
export function ContextSidebarCollapseButton() {
  const section = useContextSidebarSection()
  if (!section) return null

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Recolher barra lateral'
            aria-controls={contextSidebarId(section)}
            onClick={() => setContextSidebarOpen(section, false)}
          >
            <NexoIcon icon={PanelLeftCloseIcon} strokeWidth={2} />
          </Button>
        }
      />
      <TooltipContent side='bottom'>Recolher barra lateral</TooltipContent>
    </Tooltip>
  )
}
