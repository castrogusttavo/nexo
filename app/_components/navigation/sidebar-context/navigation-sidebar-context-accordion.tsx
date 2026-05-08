'use client'

import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export function NavGroupAccordion({
  label,
  icon,
  defaultOpen = true,
  children,
}: {
  label: string
  icon: IconType
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <Accordion defaultValue={defaultOpen ? [label] : []}>
      <AccordionItem value={label} className='border-b-0'>
        <AccordionTrigger className='py-2 hover:no-underline font-medium text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <NexoIcon icon={icon} strokeWidth={2} />
            <span>{label}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className='pb-0 space-y-px'>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
