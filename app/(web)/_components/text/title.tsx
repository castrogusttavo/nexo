import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Title({
  children,
  className,
  as: Tag = 'h1',
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <Tag className={cn('font-normal text-6xl text-center', className)}>
      {children}
    </Tag>
  )
}
