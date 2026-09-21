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
        <div className='relative group/nav-row'>
          <AccordionTrigger className='h-9 py-0 px-2.5 items-center hover:no-underline hover:bg-accent group-hover/nav-row:bg-accent rounded-md font-medium text-muted-foreground text-sm w-full'>
            <div className='flex items-center gap-2 flex-1 min-w-0'>
              {icon && <NexoIcon icon={icon} size={16} strokeWidth={2} />}
              <span className='truncate text-xs'>{label}</span>
            </div>
            {/* Holds the room the action is laid over (an icon-sm button), so
                the chevron and the row's intrinsic width -- which sets how
                far the sidebar shrinks on a narrow screen -- stay put. */}
            {action && <span aria-hidden='true' className='w-8 shrink-0' />}
          </AccordionTrigger>
          {/* A sibling of the trigger, not a child: an action inside the
              accordion's <button> is a control nested in a control. It is
              laid over the spacer above, left of the chevron (1px border +
              px-2.5 + the size-4 icon), where it sat when it was nested. */}
          {action && (
            <span className='absolute top-0 right-[27px] h-9 flex items-center opacity-0 group-hover/nav-row:opacity-100 focus-within:opacity-100 transition-opacity'>
              {action}
            </span>
          )}
        </div>
        {/* Nav items are links styled as buttons: the panel's prose-link
            underline must not reach them. */}
        <AccordionContent className='pb-0 space-y-0.5 [&_a]:no-underline'>
          {children}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
