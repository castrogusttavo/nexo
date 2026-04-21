import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

interface AProps extends ComponentProps<'a'> {
  children: React.ReactNode
  className?: string
}

export function A({ children, className, ...props }: AProps) {
  return (
    <a
      className={cn(
        'text-primary font-medium underline underline-offset-4',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}
