import { cn } from '@/lib/utils'

interface LeadProps {
  children: React.ReactNode
  className?: string
}

export function Lead({ children, className }: LeadProps) {
  return (
    <p className={cn('text-muted-foreground text-xl', className)}>{children}</p>
  )
}
