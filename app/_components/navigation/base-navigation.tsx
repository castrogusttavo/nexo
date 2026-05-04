import {
  JoinStraightIcon,
  SparklesIcon,
  StickyNote03Icon,
} from '@hugeicons-pro/core-solid-rounded'
import { Settings02Icon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Muted } from '@/components/typography/text/muted'
import { Button } from '@/components/ui/button'

export function BaseNavigation() {
  return (
    <div className=' h-screen px-2 py-3'>
      <div className='h-fit flex flex-col justify-between gap-3'>
        <ButtonNavigation linkNavigation='/' description='Projetos'>
          <NexoIcon
            icon={JoinStraightIcon}
            className='absolute top-2 right-2 size-3 rotate-180'
          />
          <NexoIcon
            icon={JoinStraightIcon}
            className='absolute bottom-2 left-2 size-3'
          />
        </ButtonNavigation>
        <ButtonNavigation linkNavigation='/' description='Wiki'>
          <NexoIcon icon={StickyNote03Icon} className='size-5' />
        </ButtonNavigation>
        <ButtonNavigation linkNavigation='/' description='IA'>
          <NexoIcon icon={SparklesIcon} className='size-5' />
        </ButtonNavigation>
        <div className='w-full h-px bg-secondary' />
        <ButtonNavigation linkNavigation='/' description='Ajustes'>
          <NexoIcon icon={Settings02Icon} className='size-5' />
        </ButtonNavigation>
      </div>
    </div>
  )
}

export function ButtonNavigation({
  linkNavigation,
  children,
  description,
}: {
  linkNavigation: string
  children: ReactNode
  description: string
}) {
  return (
    <Link
      href={linkNavigation}
      className='flex flex-col items-center justify-center text-muted-foreground'
    >
      <Button variant='ghost' size='icon' className='relative'>
        {children}
      </Button>
      <Muted className='font-medium'>{description}</Muted>
    </Link>
  )
}
