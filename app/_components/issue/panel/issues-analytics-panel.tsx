'use client'

import { useState } from 'react'
import { useIsMobile } from '@/components/hooks/use-mobile'
import { H4 } from '@/components/typography/heading/h4'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'

export function IssuesAnalyticsPanel() {
  const [open, setOpen] = useState(false)
  const projectname = 'Nome qualquer'
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      showSwipeHandle={isMobile}
      swipeDirection={isMobile ? 'down' : 'right'}
    >
      <DrawerTrigger
        render={
          <Button variant='outline' size='sm' className='h-8'>
            Análises
          </Button>
        }
      />
      <DrawerContent>
        <div>
          <H4>Análise do {projectname}</H4>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
