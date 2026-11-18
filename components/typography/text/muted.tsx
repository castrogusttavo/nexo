import { cn } from '@/lib/utils';

interface MutedProps {
  children: React.ReactNode
  className?: string
}

export function Muted({ children, className }: MutedProps) {
  return (
    <p className={cn('text-muted-foreground text-sm m-0! p-0!', className)}>{children}</p>
  )
}
