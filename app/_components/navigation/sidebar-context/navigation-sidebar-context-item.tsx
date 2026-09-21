'use client'

import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import { ButtonLink } from '@/components/button-link'
import { NexoIcon } from '@/components/icon/icon'
import { cn } from '@/lib/utils'

type IconType = Parameters<typeof NexoIcon>[0]['icon']

// One link styled as a sidebar button, never a <Link> around a <Button>: the
// nested pair was two tab stops for one destination.
export function NavItem({
  href,
  icon,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof ButtonLink>, 'href'> & {
  href: string
  icon: IconType
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <ButtonLink
      href={href}
      variant={isActive ? 'secondary' : 'ghost'}
      size='sm'
      aria-current={isActive ? 'page' : undefined}
      {...props}
      className={cn('flex w-full justify-start', className)}
    >
      <NexoIcon icon={icon} strokeWidth={2} />
      {children}
    </ButtonLink>
  )
}
