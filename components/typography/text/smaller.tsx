import { cn } from '@/lib/utils'

interface SmallerProps {
  children: React.ReactNode
  className?: string
}

export function Smaller({ children, className }: SmallerProps) {
  return (
    <small
      className={cn('text-xs leading-none font-medium text-primary', className)}
    >
      {children}
    </small>
  )
}
