import { cn } from '@/lib/utils'

interface H1Props {
  children: React.ReactNode
  className?: string
}

export function H1({ children, className }: H1Props) {
  return (
    <h1
      className={cn(
        'scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance text-primary',
        className,
      )}
    >
      {children}
    </h1>
  )
}
