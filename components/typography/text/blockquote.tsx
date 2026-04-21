import { cn } from '@/lib/utils'

interface BlockquoteProps {
  children: React.ReactNode
  className?: string
}

export function Blockquote({ children, className }: BlockquoteProps) {
  return (
    <blockquote
      className={cn('mt-6 border-l-2 pl-6 italic text-primary', className)}
    >
      {children}
    </blockquote>
  )
}
