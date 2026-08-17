'use client'

import { useIsMobile } from '@/components/hooks/use-mobile'
import { H4 } from '@/components/typography/heading/h4'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

interface IssueDetailsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IssueDetailsPanel({
  open,
  onOpenChange,
}: IssueDetailsPanelProps) {
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerContent>
        <div>
          <H4>Issue detalhes</H4>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
