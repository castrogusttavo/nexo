import { cn } from '@/lib/utils'

interface H2Props {
  children: React.ReactNode
  className?: string
}

export function H2({ children, className }: H2Props) {
  return (
    <h2
      className={cn(
        'scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0 text-primary',
        className,
      )}
    >
      {children}
    </h2>
  )
}
