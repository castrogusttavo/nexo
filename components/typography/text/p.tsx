import { cn } from '@/lib/utils'

interface PProps {
  children: React.ReactNode
  className?: string
}

export function P({ children, className }: PProps) {
  return (
    <p className={cn('leading-7 not-first:mt-6 text-primary', className)}>
      {children}
    </p>
  )
}
