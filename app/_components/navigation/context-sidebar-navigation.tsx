'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps, ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

export function ContextSidebar({ children }: { children: ReactNode }) {
  return (
    <aside className='p-3 border-r border-border h-full w-62.5'>
      <div className='space-y-4'>{children}</div>
    </aside>
  )
}

export function ContextHeader({
  title,
  actions,
  primaryAction,
}: {
  title: string
  actions?: ReactNode
  primaryAction?: ReactNode
}) {
  return (
    <div className='w-full space-y-2'>
      <div className='flex items-center justify-between'>
        <h3 className='font-semibold'>{title}</h3>
        {actions && <div className='flex items-center'>{actions}</div>}
      </div>
      {primaryAction}
    </div>
  )
}

export function ContextPrimaryAction({
  children,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button {...props} variant='secondary' className='w-full justify-start'>
      {children}
    </Button>
  )
}

export function NavGroup({ children }: { children: ReactNode }) {
  return <div className='space-y-px'>{children}</div>
}

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

export function NavItem({
  href,
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  href: string
  icon: IconType
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Button
      variant='ghost'
      size='default'
      {...props}
      render={
        <Link href={href} aria-current={isActive ? 'page' : undefined} />
      }
      className={cn(
        'w-full justify-start text-muted-foreground',
        isActive && 'bg-secondary text-secondary-foreground',
        className,
      )}
    >
      <NexoIcon icon={icon} strokeWidth={2} />
      {children}
    </Button>
  )
}

export function NavAction({
  icon,
  className,
  children,
  ...props
}: ComponentProps<typeof Button> & {
  icon: IconType
}) {
  return (
    <Button
      variant='ghost'
      size='default'
      {...props}
      className={cn(
        'w-full justify-start text-muted-foreground',
        className,
      )}
    >
      <NexoIcon icon={icon} strokeWidth={2} />
      {children}
    </Button>
  )
}
