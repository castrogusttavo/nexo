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
  action,
  children,
}: {
  label: string
  icon?: IconType
  defaultOpen?: boolean
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Accordion defaultValue={defaultOpen ? [label] : []}>
      <AccordionItem value={label} className='border-b-0'>
        <AccordionTrigger className='h-9 py-0 px-2.5 items-center hover:no-underline hover:bg-accent rounded-md font-medium text-muted-foreground text-sm'>
          <div className='flex items-center gap-2 flex-1 min-w-0'>
            {icon && <NexoIcon icon={icon} size={16} strokeWidth={2} />}
            <span className='truncate text-xs'>{label}</span>
          </div>
          {action && (
            <span
              className='opacity-0 group-hover/accordion-trigger:opacity-100 transition-opacity shrink-0'
              onClick={(e) => e.stopPropagation()}
            >
              {action}
            </span>
          )}
        </AccordionTrigger>
        <AccordionContent className='pb-0 space-y-0.5'>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
