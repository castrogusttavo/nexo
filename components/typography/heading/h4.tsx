import { cn } from '@/lib/utils'

interface H4Props {
  children: React.ReactNode
  className?: string
}

export function H4({ children, className }: H4Props) {
  return (
    <h4
      className={cn(
        'scroll-m-20 text-xl font-semibold tracking-tight text-primary',
        className,
      )}
    >
      {children}
    </h4>
  )
}
