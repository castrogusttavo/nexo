'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

export function GlobalButtonNavigation({
  linkNavigation,
  children,
  description,
  active = false,
}: {
  linkNavigation: string
  children: ReactNode
  description: string
  active?: boolean
}) {
  return (
    <Link
      href={linkNavigation}
      aria-current={active ? 'page' : undefined}
      className='flex flex-col items-center justify-center text-muted-foreground'
    >
      <Button
        variant={active ? 'secondary' : 'ghost'}
        size='icon'
        className='relative'
      >
        {children}
      </Button>
      <Muted className='font-medium'>{description}</Muted>
    </Link>
  )
}
