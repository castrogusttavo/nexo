import Link from 'next/link'
import type { ReactNode } from 'react'
import { H2 } from '@/components/typography/heading/h2'
import { H3 } from '@/components/typography/heading/h3'
import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  as: 'h2' | 'h3'
  id: string
  className?: string
  children: ReactNode
}

// The "#" is absolute with no "top" set — this makes the browser keep the
// static vertical position (the same it would have in normal text flow),
// so it aligns with the heading's line with no manual centering math.
// "-left-6" from the tag itself (not from a wrapper with padding) ensures
// h2 and h3 form the same vertical ruler on the left.
export function SectionHeading({
  as,
  id,
  className,
  children,
}: SectionHeadingProps) {
  const Tag = as === 'h2' ? H2 : H3

  return (
    <Tag className={cn('group relative', className)}>
      <Link
        href={`#${id}`}
        aria-label='Link para esta seção'
        tabIndex={-1}
        className='absolute -left-6 hidden select-none text-transparent transition-colors group-hover:text-muted-foreground/60 hover:no-underline md:inline-block'
      >
        #
      </Link>
      <Link href={`#${id}`} className='hover:underline'>
        {children}
      </Link>
    </Tag>
  )
}
