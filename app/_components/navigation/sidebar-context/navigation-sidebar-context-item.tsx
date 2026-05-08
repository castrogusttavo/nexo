'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

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
    <Link href={href} className='block'>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        size='default'
        {...props}
        className={cn('w-full justify-start', className)}
      >
        <NexoIcon icon={icon} strokeWidth={2} />
        {children}
      </Button>
    </Link>
  )
}
