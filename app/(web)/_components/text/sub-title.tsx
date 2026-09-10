import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SubTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground font-normal text-base md:whitespace-pre-line',
        className,
      )}
    >
      {children}
    </div>
  )
}
