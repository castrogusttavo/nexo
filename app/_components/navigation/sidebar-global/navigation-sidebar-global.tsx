'use client'

import {
  JoinStraightIcon,
  SparklesIcon,
  StickyNote03Icon,
} from '@hugeicons-pro/core-solid-rounded'
import { Settings02Icon } from '@hugeicons-pro/core-stroke-rounded'
import { usePathname } from 'next/navigation'
import { NexoIcon } from '@/components/icon/icon'
import { NavigationSidebarGlobalButton } from './navigation-sidebar-global-button'

export function NavigationSidebarGlobal({ slug }: { slug: string }) {
  const base = `/${slug}`
  const pathname = usePathname()

  const sectionRoots = [`${base}/wiki`, `${base}/ai`, `${base}/settings`]

  const isActive = (href: string) =>
    href === base
      ? pathname === base ||
        (pathname.startsWith(`${base}/`) &&
          !sectionRoots.some(
            (root) => pathname === root || pathname.startsWith(`${root}/`),
          ))
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className=' h-screen px-2 py-3'>
      <div className='h-fit flex flex-col justify-between gap-3'>
        <NavigationSidebarGlobalButton
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
        </NavigationSidebarGlobalButton>
        <NavigationSidebarGlobalButton
          linkNavigation={`${base}/wiki`}
          description='Wiki'
          active={isActive(`${base}/wiki`)}
        >
          <NexoIcon icon={StickyNote03Icon} className='size-5' />
        </NavigationSidebarGlobalButton>
        <NavigationSidebarGlobalButton
          linkNavigation={`${base}/ai`}
          description='IA'
          active={isActive(`${base}/ai`)}
        >
          <NexoIcon icon={SparklesIcon} className='size-5' />
        </NavigationSidebarGlobalButton>
        <div className='w-full h-px bg-secondary' />
        <NavigationSidebarGlobalButton
          linkNavigation={`${base}/settings`}
          description='Ajustes'
          active={isActive(`${base}/settings`)}
        >
          <NexoIcon icon={Settings02Icon} className='size-5' />
        </NavigationSidebarGlobalButton>
      </div>
    </div>
  )
}
