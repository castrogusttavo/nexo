import { ArrowUpRightIcon } from '@hugeicons-pro/core-stroke-rounded'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { NexoIcon } from '@/components/icon/icon'
import { Badge } from '@/components/ui/badge'

// A pill link to an outside product (an integration, a competitor), with its
// logo and the "leaves this menu" arrow.
export function WebHeaderMenuBadge({
  href,
  icon,
  children,
}: {
  href: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Badge
      className='py-3'
      render={
        <Link href={href}>
          {icon}
          {children}
          <NexoIcon icon={ArrowUpRightIcon} />
        </Link>
      }
    />
  )
}
