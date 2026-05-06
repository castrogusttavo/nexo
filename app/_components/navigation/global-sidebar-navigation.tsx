'use client'

import {
  JoinStraightIcon,
  SparklesIcon,
  StickyNote03Icon,
} from '@hugeicons-pro/core-solid-rounded'
import { Settings02Icon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

export function GlobalSidebarNavigation({ slug }: { slug: string }) {
  const base = `/${slug}`
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href)

  return (
    <div className=' h-screen px-2 py-3'>
      <div className='h-fit flex flex-col justify-between gap-3'>
        <GlobalButtonNavigation
          linkNavigation={base}
          description='Projetos'
          active={isActive(base)}
        >
          <NexoIcon
            icon={JoinStraightIcon}
            className='absolute top-2 right-2 size-3 rotate-180'
          />
          <NexoIcon
            icon={JoinStraightIcon}
            className='absolute bottom-2 left-2 size-3'
          />
        </GlobalButtonNavigation>
        <GlobalButtonNavigation
          linkNavigation={`${base}/wiki`}
          description='Wiki'
          active={isActive(`${base}/wiki`)}
        >
          <NexoIcon icon={StickyNote03Icon} className='size-5' />
        </GlobalButtonNavigation>
        <GlobalButtonNavigation
          linkNavigation={`${base}/ai`}
          description='IA'
          active={isActive(`${base}/ai`)}
        >
          <NexoIcon icon={SparklesIcon} className='size-5' />
        </GlobalButtonNavigation>
        <div className='w-full h-px bg-secondary' />
        <GlobalButtonNavigation
          linkNavigation={`${base}/settings`}
          description='Ajustes'
          active={isActive(`${base}/settings`)}
        >
          <NexoIcon icon={Settings02Icon} className='size-5' />
        </GlobalButtonNavigation>
      </div>
    </div>
  )
}

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
