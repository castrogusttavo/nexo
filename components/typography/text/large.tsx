import { cn } from '@/lib/utils'

interface LargeProps {
  children: React.ReactNode
  className?: string
}

export function Large({ children, className }: LargeProps) {
  return (
    <div className={cn('text-lg font-semibold text-primary', className)}>
      {children}
    </div>
  )
}
