import { cn } from '@/lib/utils'

interface SmallProps {
  children: React.ReactNode
  className?: string
}

export function Small({ children, className }: SmallProps) {
  return (
    <small
      className={cn('text-sm leading-none font-medium text-primary', className)}
    >
      {children}
    </small>
  )
}
